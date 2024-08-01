// import the original type declarations
import "i18next";
// import all namespaces (for the default language, only)
import global from "../locales/en/global.json";
import commands from "../locales/en/commands.json";

declare module "i18next" {
  // Extend CustomTypeOptions
  interface CustomTypeOptions {
    // custom namespace type, if you changed it
    defaultNS: "global";
    // custom resources type
    resources: {
      global: typeof global;
      commands: typeof commands;
    };
    // other
  }
}