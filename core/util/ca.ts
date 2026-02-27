import { globalAgent } from "https";
import * as tls from "tls";

// @ts-ignore
import { systemCertsAsync } from "system-ca";

export async function setupCa() {
  try {
    const systemCerts = await systemCertsAsync();

    // Node's global fetch() uses undici and reads from tls default certificates,
    // not https.globalAgent. Merge system certs into tls defaults so both stacks
    // trust the OS certificate store.
    const getDefaultCerts = (tls as any).getCACertificates;
    const setDefaultCerts = (tls as any).setDefaultCACertificates;
    if (
      typeof getDefaultCerts === "function" &&
      typeof setDefaultCerts === "function"
    ) {
      const defaultCerts = getDefaultCerts("default");
      setDefaultCerts([...defaultCerts, ...systemCerts]);
    }

    switch (process.platform) {
      case "darwin":
        // https://www.npmjs.com/package/mac-ca#usage
        const macCa = await import("mac-ca");
        macCa.addToGlobalAgent();
        break;
      case "win32":
        // https://www.npmjs.com/package/win-ca#caveats
        const winCa = await import("win-ca");
        winCa.inject("+");
        break;
      default:
        // https://www.npmjs.com/package/system-ca
        globalAgent.options.ca = systemCerts;
        break;
    }
  } catch (e) {
    console.warn("Failed to setup CA: ", e);
  }
}
