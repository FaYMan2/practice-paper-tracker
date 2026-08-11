/**
 * Barrel for the shared domain types.
 *
 * Module-local types live beside their implementation in `utils/<module>/types.ts`;
 * only types crossing module boundaries belong here.
 */

export type * from "./attempt";
export type * from "./diagnostic";
export type * from "./messaging";
export type * from "./question";
export type * from "./settings";
export type * from "./summary";
export type * from "./topic";
