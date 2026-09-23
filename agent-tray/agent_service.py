"""Windows service host for the Kuamini agent's background protection work."""

import logging
import os
import threading
import time
import json
from pathlib import Path

import win32event
import win32service
import win32serviceutil

from main import (
    check_pending_scan_commands,
    check_pending_threat_action_commands,
    heartbeat,
    initialize_threat_detection,
    register,
    report_scan_command_result,
    report_threat_action_command_result,
    setup_logging,
)


def shared_config_path() -> Path:
    program_data = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData"))
    return program_data / "KuaminiSecurityClient" / "config.json"

def shared_threat_state_path() -> Path:
    program_data = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData"))
    return program_data / "KuaminiSecurityClient" / "threat_state.json"

def process_threat_report(threat_system, report, endpoint_id, state_path):
    """Report detected threats, execute recommended actions, and persist unresolved state."""
    unresolved = []

    ok, results = threat_system["reporter"].report_scan_results(
        report,
        endpoint_id=endpoint_id,
    )

    for index, result in enumerate(results):
        threat = report.threats[index] if index < len(report.threats) else {}
        response = result.get("result") if isinstance(result.get("result"), dict) else {}

        if not result.get("success"):
            unresolved.append(threat)
            logging.warning(
                "Threat report failed: %s",
                threat.get("threat_name", "Unknown threat"),
            )
            continue

        action = response.get("recommended_action") or response.get("auto_action")
        threat_id = response.get("threat_id")

        if not action:
            unresolved.append(threat)
            logging.warning(
                "No remediation action returned for threat: %s",
                threat.get("threat_name", "Unknown threat"),
            )
            continue

        action = str(action).lower()
        if action == "block":
            action = "kill"

        executor = threat_system["executor"]

        if action == "quarantine" and threat.get("file_path"):
            handled, message = executor.quarantine_file(threat["file_path"])
        elif action == "restore" and threat.get("file_path"):
            handled, message = executor.restore_file(threat["file_path"])
        elif action == "delete" and threat.get("file_path"):
            handled, message = executor.delete_file(threat["file_path"])
        elif action == "kill" and threat.get("process_id"):
            handled, message = executor.kill_process(int(threat["process_id"]))
        elif action == "allow" and threat.get("file_hash"):
            handled, message = executor.allow_threat(threat["file_hash"])
        else:
            handled = False
            message = f"Unsupported or missing data for action: {action}"

        if not handled:
            unresolved.append(threat)
            logging.warning(
                "Threat action failed: %s - %s",
                threat.get("threat_name", "Unknown threat"),
                message,
            )
            continue

        if threat_id:
            status_map = {
                "quarantine": "quarantined",
                "kill": "killed",
                "delete": "resolved",
                "allow": "allowed",
                "restore": "resolved",
            }
            status_ok, status_result = threat_system["reporter"].update_threat_status(
                threat_id,
                status_map.get(action, "resolved"),
                action=action,
            )

            if not status_ok:
                unresolved.append(threat)
                logging.warning(
                    "Threat action succeeded but server status update failed: %s",
                    threat.get("threat_name", "Unknown threat"),
                )
                continue

        logging.info(
            "Threat resolved: %s (%s)",
            threat.get("threat_name", "Unknown threat"),
            action,
        )

    state_path = Path(state_path)
    state_path.parent.mkdir(parents=True, exist_ok=True)

    state = {
        "has_unresolved_threats": bool(unresolved),
        "unresolved_count": len(unresolved),
        "threats": unresolved,
        "updated_at": time.time(),
    }

    state_path.write_text(
        json.dumps(state, indent=2, default=str),
        encoding="utf-8",
    )

    return ok, unresolved
def execute_threat_action(
    threat_system,
    action: str,
    threat: dict,
):
    action = str(action or "").lower()

    if action == "block":
        action = "kill"

    executor = threat_system["executor"]

    if action == "quarantine" and threat.get("file_path"):
        return executor.quarantine_file(
            threat["file_path"]
        )

    if action == "restore" and threat.get("file_path"):
        return executor.restore_file(
            threat["file_path"]
        )

    if action == "delete" and threat.get("file_path"):
        return executor.delete_file(
            threat["file_path"]
        )

    if action == "kill" and threat.get("process_id"):
        return executor.kill_process(
            int(threat["process_id"])
        )

    if action == "allow" and threat.get("file_hash"):
        return executor.allow_threat(
            threat["file_hash"]
        )

    return False, f"Unsupported or missing data for action: {action}"
class KuaminiSecurityClientService(win32serviceutil.ServiceFramework):
    _svc_name_ = "KuaminiSecurityClient"
    _svc_display_name_ = "Kuamini Security Client"
    _svc_description_ = "Kuamini endpoint protection, threat detection, and reporting service."

    def __init__(self, args):
        super().__init__(args)
        self.stop_event = threading.Event()
        self.stop_handle = win32event.CreateEvent(None, 0, 0, None)

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.stop_event.set()
        win32event.SetEvent(self.stop_handle)

    def SvcDoRun(self):
        self.ReportServiceStatus(win32service.SERVICE_RUNNING)
        setup_logging()
        logging.info("Kuamini Windows service started")

        config_path = shared_config_path()
        config_path.parent.mkdir(parents=True, exist_ok=True)

        threat_system = None
        next_scan_at = 0.0

        while not self.stop_event.is_set():
            try:
                registered, result = register(str(config_path))

                if not registered:
                    logging.warning(
                        "Service registration retry pending: %s",
                        result,
                    )
                    self.stop_event.wait(30)
                    continue

                config = __import__("main").load_config(
                    str(config_path)
                )

                threat_system = initialize_threat_detection(
                    config,
                    log_callback=logging.info,
                )

                break

            except Exception:
                logging.exception(
                    "Service registration attempt failed"
                )
                self.stop_event.wait(30)

        while not self.stop_event.is_set():
            try:
                config = __import__("main").load_config(
                    str(config_path)
                )

                hb_ok, hb_msg = heartbeat(config)

                if (
                    not hb_ok
                    and (
                        "re_register" in str(hb_msg).lower()
                        or "not found" in str(hb_msg).lower()
                    )
                ):
                    logging.warning(
                        "Endpoint not found during heartbeat (%s), "
                        "re-registering...",
                        hb_msg,
                    )

                    reg_ok, _ = register(
                        str(config_path)
                    )

                    if reg_ok:
                        config = __import__("main").load_config(
                            str(config_path)
                        )

                if threat_system and threat_system.get("enabled"):

                    # --------------------------------------------------
                    # Check pending threat action commands
                    # --------------------------------------------------

                    action_command, action_error = (
                        check_pending_threat_action_commands(
                            config
                        )
                    )

                    if action_error:
                        logging.debug(
                            "Threat action command check failed: %s",
                            action_error,
                        )

                    if action_command:
                        action = str(
                            action_command.get("action") or ""
                        ).lower()

                        command_id = action_command.get("id")

                        payload = (
                            action_command.get("payload") or {}
                        )

                        if isinstance(payload, dict):
                            file_path = payload.get("file_path")
                            process_id = payload.get("process_id")
                            file_hash = payload.get("file_hash")
                        else:
                            file_path = None
                            process_id = None
                            file_hash = None

                        threat = {
                            "file_path": file_path,
                            "process_id": process_id,
                            "file_hash": file_hash,
                        }

                        if command_id:
                            logging.info(
                                "Threat action command received: "
                                "command_id=%s action=%s file_path=%s",
                                command_id,
                                action,
                                file_path,
                            )

                            handled, message = execute_threat_action(
                                threat_system,
                                action,
                                threat,
                            )

                            if handled:
                                report_threat_action_command_result(
                                    config,
                                    command_id=command_id,
                                    status="completed",
                                    result_details={
                                        "message": message,
                                        "action": action,
                                        "file_path": file_path,
                                    },
                                )

                                logging.info(
                                    "Threat action completed: "
                                    "command_id=%s action=%s",
                                    command_id,
                                    action,
                                )

                            else:
                                report_threat_action_command_result(
                                    config,
                                    command_id=command_id,
                                    status="failed",
                                    error_message=message,
                                    result_details={
                                        "action": action,
                                        "file_path": file_path,
                                    },
                                )

                                logging.warning(
                                    "Threat action failed: "
                                    "command_id=%s error=%s",
                                    command_id,
                                    message,
                                )

                    # --------------------------------------------------
                    # Existing scan-command logic
                    # --------------------------------------------------

                    command, error = check_pending_scan_commands(
                        config
                    )

                    if command:
                        scan_type = str(
                            command.get("scan_type") or "quick"
                        ).lower()

                        engine = threat_system["engine"]

                        if scan_type == "full":
                            report = engine.full_scan()
                        else:
                            report = engine.quick_scan()

                        process_threat_report(
                            threat_system,
                            report,
                            config.get("endpoint_id"),
                            shared_threat_state_path(),
                        )

                        report_scan_command_result(
                            config,
                            command_id=command["id"],
                            scan_id=report.scan_id,
                            scan_type=report.scan_type,
                            total_threats=report.total_threats,
                            severity_breakdown={
                                "critical": report.critical_count,
                                "high": report.high_count,
                                "medium": report.medium_count,
                                "low": report.low_count,
                            },
                        )

                    elif time.monotonic() >= next_scan_at:
                        report = (
                            threat_system["engine"].quick_scan()
                        )

                        process_threat_report(
                            threat_system,
                            report,
                            config.get("endpoint_id"),
                            shared_threat_state_path(),
                        )

                        next_scan_at = (
                            time.monotonic()
                            + int(
                                config.get(
                                    "threat_scan_interval"
                                )
                                or 3600
                            )
                        )

            except Exception:
                logging.exception(
                    "Service protection cycle failed"
                )

            interval = (
                int(
                    config.get("heartbeat_interval")
                    or 60
                )
                if "config" in locals()
                else 60
            )

            self.stop_event.wait(interval)

        logging.info("Kuamini Windows service stopped")


def run_service() -> None:
    import sys
    import servicemanager

    if len(sys.argv) == 1 or (
        len(sys.argv) > 1
        and sys.argv[1].lower() in ("--service", "/service")
    ):
        try:
            servicemanager.Initialize()
            servicemanager.PrepareToHostSingle(
                KuaminiSecurityClientService
            )
            servicemanager.StartServiceCtrlDispatcher()
        except Exception as e:
            logging.exception(
                "Failed to start ServiceControlDispatcher: %s",
                e,
            )
    else:
        win32serviceutil.HandleCommandLine(
            KuaminiSecurityClientService
        )
