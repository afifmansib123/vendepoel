"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Set your public access token here
mapboxgl.accessToken =
  "pk.eyJ1IjoidHJhbnN0aGVjb250aW5lbnRhbCIsImEiOiJjbWF4eTA1bDUwM2k2Mm1wcHR2bnpsczhyIn0.4zC4gD5CEZmGwyDf3idZ9g";

const SimpleMap = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-74.5, 40], // longitude, latitude
      zoom: 9,
    });

    return () => map.remove();
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height: "500px",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  );
};

export default SimpleMap;
