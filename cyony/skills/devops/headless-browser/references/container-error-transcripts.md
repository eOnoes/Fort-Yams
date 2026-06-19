# Chromium Container Error Transcripts

Real error output from Chromium 151 on a no-dbus Linux VPS (x86_64, Debian Bookworm, kernel 6.8).

## D-Bus Errors (cosmetic)

```
[94821:94831:0604/194123.558166:ERROR:dbus/bus.cc:405] Failed to connect to the bus:
  Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[94821:94831:0604/194123.568565:ERROR:dbus/bus.cc:405] Failed to connect to the bus:
  Could not parse server address: Unknown address type
```

These appear repeatedly but don't affect headless operation. Ignore them.

## Crashpad FD Ownership Violation (cosmetic but noisy)

```
Crashing due to FD ownership violation:
#0 base::debug::CollectStackTrace()
#1 base::debug::StackTrace::StackTrace()
#2 (anonymous namespace)::CrashOnFdOwnershipViolation()
#3 base::internal::ScopedFDCloseTraits::Acquire()
#4 crash_reporter::internal::PlatformCrashpadInitialization()
#5 crash_reporter::InitializeCrashpad()
#6 ChromeMainDelegate::PreSandboxStartup()
...
Received signal 6 (SIGABRT)
```

This crash-and-restart loop repeats ~10 times per invocation. Despite the stack trace, the browser DOES produce output:

```
2137 bytes written to file /tmp/chrome-test.png
```

## Network Service Crash

```
[94821:94821:0604/194214.776558:ERROR:content/browser/network_service_instance_impl.cc:721]
  Network service crashed or was terminated, restarting service.
```

Also cosmetic in headless mode — the network service restarts and page loads complete.

## Key Insight

**All three error categories are container-environment noise, not browser failures.** The verification is always: did the screenshot/HTML file get written? If yes, the browser tools will work.

`--disable-crashpad-for-testing` prevents the SIGABRT crashes but the D-Bus and network service noise remains. None of it is actionable.
