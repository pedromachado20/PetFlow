/// <reference types="vinxi/types/server" />
import { createStartHandler } from "@tanstack/start-server-core";
import { defaultStreamHandler } from "@tanstack/react-start-server";
import { getRouterManifest } from "@tanstack/react-start-router-manifest";
import { createRouter } from "./router";

export default createStartHandler({ createRouter, getRouterManifest })(defaultStreamHandler);
