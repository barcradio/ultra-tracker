import { Link } from "@tanstack/react-router";
import { classed } from "~/lib/classed";
import { Button } from "./Button";

export const ButtonLink = classed(Link, Button);
