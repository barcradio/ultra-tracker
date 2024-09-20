import { ipcMain } from "electron";
import { appStore } from "../lib/store";
import { Handler } from "../types";

type TypedKey = Parameters<typeof appStore.delete>[0];

const getStoreValue: Handler<string, unknown> = (_, storeKey) => appStore.get(storeKey);
const hasStoreValue: Handler<string, boolean> = (_, storeKey) => appStore.has(storeKey);
const deleteStoreValue: Handler<TypedKey> = (_, storeKey) => appStore.delete(storeKey);
const resetStoreValue: Handler<TypedKey> = (_, storeKey) => appStore.reset(storeKey);
const clearStore: Handler<void, void> = () => appStore.clear();

const setStoreValue: Handler<{ key: string; value: unknown }> = (_, { key, value }) => {
  return appStore.set(key, value);
};

export const initStoreHandlers = () => {
  ipcMain.handle("get-store-value", getStoreValue);
  ipcMain.handle("set-store-value", setStoreValue);
  ipcMain.handle("has-store-value", hasStoreValue);
  ipcMain.handle("reset-store-value", resetStoreValue);
  ipcMain.handle("delete-store-value", deleteStoreValue);
  ipcMain.handle("clear-store", clearStore);
};
