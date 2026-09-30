"""Windows service host for the Kuamini agent's background protection work."""

import logging
import os
import threading
import time
import json
import hashlib
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

def calculate_file_hash(file_path: str) -> str | None:
    """Calculate SHA-256 hash for a file."""
    try:
        hash_obj = hashlib.sha256()

        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hash_obj.update(chunk)

        return hash_obj.hexdigest()
    except Exception as e:
        logging.warning("Failed to calculate file hash for %s: %s", file_path, e)
        return None
def build_threat_action_policies(policies) -> dict:
    """Build a threat_type -> action mapping from active heartbeat policies."""
    threat_action_policies = {}

    if not isinstance(policies, list):
        return threat_action_policies

    for policy in policies:
        if not isinstance(policy, dict):
            continue

        if not policy.get("is_active"):
            continue

        if policy.get("status") != "active":
            continue

        if policy.get("type") != "threat_actions":
            continue

        config = policy.get("config")
        if not isinstance(config, dict):
            continue

        threat_type = config.get("threatType")
        action = config.get("action")

        if not threat_type or not action:
            continue

        action = str(action).lower()

        if action == "block":
            action = "kill"

        threat_action_policies[str(threat_type).lower()] = action

    return threat_action_policies

def process_threat_report(
    threat_system,
    report,
    endpoint_id,
    state_path,
    threat_action_policies,
):
    """Execute local threat policies, report threats, and persist unresolved state."""

    unresolved = []
    report_ok = True

    for threat in report.threats:
        if not isinstance(threat, dict):
            continue

        threat_name = threat.get("threat_name", "Unknown threat")
        threat_type = str(threat.get("threat_type", "")).lower()

        # ---------------------------------------------------------
        # 1. Check locally synchronized policy
        # ---------------------------------------------------------
        action = threat_action_policies.get(threat_type)

        if action:
            logging.info(
                "Local threat policy matched: threat_type=%s action=%s",
                threat_type,
                action,
            )

            handled, message = execute_threat_action(
                threat_system,
                action,
                threat,
            )

            if not handled:
                unresolved.append(threat)

                logging.warning(
                    "Threat action failed: %s - %s",
                    threat_name,
                    message,
                )
        else:
            handled = True

            logging.info(
                "No local threat policy matched: threat_type=%s",
                threat_type,
            )

        # ---------------------------------------------------------
        # 2. Report the threat AFTER local action
        # ---------------------------------------------------------
        success, response = threat_system["reporter"].report_threat(
            threat,
            endpoint_id=endpoint_id,
        )

        if not success:
            report_ok = False

            if threat not in unresolved:
                unresolved.append(threat)

            logging.warning(
                "Threat report failed: %s",
                threat_name,
            )

            continue

        # ---------------------------------------------------------
        # 3. Update server status if local action succeeded
        # ---------------------------------------------------------
        if action and handled:
            threat_id = None

            if isinstance(response, dict):
                threat_id = response.get("threat_id")

            if threat_id:
                status_map = {
                    "quarantine": "quarantined",
                    "kill": "killed",
                    "delete": "resolved",
                    "allow": "allowed",
                    "restore": "resolved",
                }

                status = status_map.get(action)

                if status:
                    status_ok, status_result = (
                        threat_system["reporter"].update_threat_status(
                            threat_id,
                            status,
                            action=action,
                        )
                    )

                    if not status_ok:
                        unresolved.append(threat)

                        logging.warning(
                            "Threat action succeeded but server status "
                            "update failed: %s",
                            threat_name,
                        )

                        continue

            logging.info(
                "Threat resolved: %s (%s)",
                threat_name,
                action,
            )

        # -------------------------------------------------------------
    # 4. Persist unresolved threat state
    # -------------------------------------------------------------
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

    # -------------------------------------------------------------
    # 5. Report scan summary for console dashboard visibility
    # -------------------------------------------------------------
    try:
        summary_ok, summary_result = threat_system["reporter"].report_scan_summary(
            report,
            endpoint_id,
        )

        if summary_ok:
            logging.info("Scan summary recorded in console")
        else:
            logging.warning(
                "Failed to record scan summary: %s",
                summary_result.get("error", "Unknown error")
                if isinstance(summary_result, dict)
                else summary_result,
            )
    except Exception as e:
        logging.warning(
            "Exception reporting scan summary: %s",
            e,
        )

    return report_ok, unresolved
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

    if action == "allow":
       file_hash = threat.get("file_hash")

       if not file_hash and threat.get("file_path"):
        file_hash = calculate_file_hash(threat["file_path"])

       if file_hash:
        return executor.allow_threat(file_hash)

       return False, "Unable to calculate file hash for allow action"

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
        threat_action_policies = {}

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

                if hb_ok and isinstance(hb_msg, dict):
                    threat_action_policies = build_threat_action_policies(
                        hb_msg.get("policies")
                    )


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
                            threat_action_policies,
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
                            threat_action_policies,
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
