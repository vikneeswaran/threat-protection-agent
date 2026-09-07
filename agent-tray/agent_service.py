"""Windows service host for the Kuamini agent's background protection work."""

import logging
import os
import threading
import time
from pathlib import Path

import win32event
import win32service
import win32serviceutil

from main import (
    check_pending_scan_commands,
    heartbeat,
    initialize_threat_detection,
    register,
    report_scan_command_result,
    setup_logging,
)


def shared_config_path() -> Path:
    program_data = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData"))
    return program_data / "KuaminiSecurityClient" / "config.json"


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
                    logging.warning("Service registration retry pending: %s", result)
                    self.stop_event.wait(30)
                    continue

                config = __import__("main").load_config(str(config_path))
                threat_system = initialize_threat_detection(config, log_callback=logging.info)
                break
            except Exception:
                logging.exception("Service registration attempt failed")
                self.stop_event.wait(30)

        while not self.stop_event.is_set():
            try:
                config = __import__("main").load_config(str(config_path))
                hb_ok, hb_msg = heartbeat(config)
                if not hb_ok and ("re_register" in str(hb_msg).lower() or "not found" in str(hb_msg).lower()):
                    logging.warning("Endpoint not found during heartbeat (%s), re-registering...", hb_msg)
                    reg_ok, _ = register(str(config_path))
                    if reg_ok:
                        config = __import__("main").load_config(str(config_path))

                if threat_system and threat_system.get("enabled"):
                    command, error = check_pending_scan_commands(config)
                    if command:
                        scan_type = str(command.get("scan_type") or "quick").lower()
                        engine = threat_system["engine"]
                        report = engine.full_scan() if scan_type == "full" else engine.quick_scan()
                        threat_system["reporter"].report_scan_results(report, endpoint_id=config.get("endpoint_id"))
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
                        report = threat_system["engine"].quick_scan()
                        threat_system["reporter"].report_scan_results(report, endpoint_id=config.get("endpoint_id"))
                        next_scan_at = time.monotonic() + int(config.get("threat_scan_interval") or 3600)
            except Exception:
                logging.exception("Service protection cycle failed")

            interval = int(config.get("heartbeat_interval") or 60) if "config" in locals() else 60
            self.stop_event.wait(interval)

        logging.info("Kuamini Windows service stopped")


def run_service() -> None:
    import sys
    import servicemanager

    if len(sys.argv) == 1 or (len(sys.argv) > 1 and sys.argv[1].lower() in ("--service", "/service")):
        try:
            servicemanager.Initialize()
            servicemanager.PrepareToHostSingle(KuaminiSecurityClientService)
            servicemanager.StartServiceCtrlDispatcher()
        except Exception as e:
            logging.exception("Failed to start ServiceControlDispatcher: %s", e)
    else:
        win32serviceutil.HandleCommandLine(KuaminiSecurityClientService)