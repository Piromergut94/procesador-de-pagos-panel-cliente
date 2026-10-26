import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CLUB_HOST, portalLocation, resolvePortalCompany } from "./portalCompany";

const CompanyContext = createContext({
  loading: false,
  mode: "current",
  slug: null,
  sendSlug: false,
  branding: null,
});

const CLUB_BRANDING = {
  display_name: "Club del Seguro",
  logo_url: "",
  primary_color: "",
  secondary_color: "",
  privacy_policy_url: "https://portal-pagos.clubdelseguro.cl/politica-privacidad",
};

export function CompanyProvider({ children }) {
  const location = useLocation();
  const place = portalLocation(window.location.hostname, location.pathname);
  const [state, setState] = useState(() => ({
    loading: place.mode !== "current" && place.mode !== "neutral" && place.mode !== "unknown",
    mode: place.mode,
    slug: place.slug ?? null,
    sendSlug: Boolean(place.sendSlug),
    branding: place.mode === "current" ? CLUB_BRANDING : null,
  }));

  useEffect(() => {
    const next = portalLocation(window.location.hostname, location.pathname);
    let alive = true;
    if (next.mode === "neutral" || next.mode === "unknown") {
      setState({ loading: false, mode: next.mode, slug: null, sendSlug: false, branding: null });
      return undefined;
    }
    if (next.mode === "current") {
      setState({
        loading: false,
        mode: "current",
        slug: null,
        sendSlug: false,
        branding: CLUB_BRANDING,
      });
      resolvePortalCompany({ hostname: CLUB_HOST }).then((data) => {
        if (!alive || !data?.branding) return;
        setState((prev) => ({ ...prev, branding: { ...CLUB_BRANDING, ...data.branding } }));
      }).catch(() => {});
      return () => {
        alive = false;
      };
    }
    setState({
      loading: true,
      mode: next.mode,
      slug: next.slug ?? null,
      sendSlug: true,
      branding: null,
    });
    const request = next.mode === "custom"
      ? { hostname: next.hostname }
      : { slug: next.slug };
    resolvePortalCompany(request).then((data) => {
      if (!alive) return;
      if (!data?.slug) {
        setState({ loading: false, mode: "unknown", slug: null, sendSlug: false, branding: null });
        return;
      }
      setState({
        loading: false,
        mode: next.mode,
        slug: data.slug,
        sendSlug: true,
        branding: data.branding || null,
      });
    }).catch(() => {
      if (!alive) return;
      setState({ loading: false, mode: "unknown", slug: null, sendSlug: false, branding: null });
    });
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  useEffect(() => {
    const color = state.branding?.primary_color || "";
    if (/^#[0-9a-fA-F]{3,8}$/.test(color)) {
      document.documentElement.style.setProperty("--portal-primary", color);
    } else {
      document.documentElement.style.removeProperty("--portal-primary");
    }
    return () => {
      document.documentElement.style.removeProperty("--portal-primary");
    };
  }, [state.branding]);

  return <CompanyContext.Provider value={state}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  return useContext(CompanyContext);
}
