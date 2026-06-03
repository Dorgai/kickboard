import type { MetadataRoute } from "next";
import { THEME_META_LIGHT } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kickboard",
    short_name: "Kickboard",
    description:
      "World Cup predictions, Coach Board squads, and fan community on Kickboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9fafb",
    theme_color: THEME_META_LIGHT,
    categories: ["sports", "entertainment"],
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
