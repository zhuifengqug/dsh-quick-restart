# dsh-quick-restart

A standalone dsh bundle that adds the human-facing `/restart` command and a clickable restart button in the upper-right corner of the Web GUI.

Install it into a profile from this directory:

```sh
dsh plugin --profile web add D:/dsh/dsh-quick-restart
```

The button asks for confirmation, then sends a same-origin request to the plugin's loopback-only restart route. `/restart` remains available as an alternative. Both paths start a detached Node relay with the current dsh entry point, `execArgv`, profile arguments, working directory, and application arguments. The relay waits for the current process to exit before launching the replacement, avoiding a Web port race.

`/restart` accepts no arguments. The browser route accepts only `POST` requests from the same loopback origin. Active model or tool work is interrupted by the process shutdown; durable session state is reloaded by the replacement process.
