import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";

type LocationResult = {
  place_id: number;
  display_name: string;
};

interface ProjectLocationPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const locationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) return "Location permission was denied.";
  if (error.code === error.TIMEOUT) return "Getting your location timed out. Please try again.";
  if (error.code === error.POSITION_UNAVAILABLE) return "Your current location is unavailable.";
  return "Unable to get your current location.";
};

export function ProjectLocationPicker({ value, onChange }: ProjectLocationPickerProps) {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (!value.trim()) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setError("");
      setShowResults(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(value.trim())}`,
          { headers: { Accept: "application/json" }, signal: controller.signal },
        );
        if (!response.ok) throw new Error("Location search failed.");
        const data = await response.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") {
          setResults([]);
          setError("Unable to search locations right now.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  const selectLocation = (location: string) => {
    skipNextSearch.current = true;
    onChange(location);
    setResults([]);
    setShowResults(false);
    setError("");
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { Accept: "application/json" } },
          );
          if (!response.ok) throw new Error("Reverse geocoding failed.");
          const data = await response.json();
          if (!data?.display_name) throw new Error("No place name was found for your location.");
          selectLocation(data.display_name);
        } catch {
          setError("Your coordinates were found, but the place name could not be loaded.");
        } finally {
          setIsLocating(false);
        }
      },
      (locationError) => {
        setError(locationErrorMessage(locationError));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            setError("");
            if (!nextValue.trim()) {
              setResults([]);
              setShowResults(false);
            }
          }}
          onFocus={() => value.trim() && setShowResults(true)}
          placeholder="e.g., Field Station A, Block 3"
          className="w-full rounded-2xl bg-secondary/50 py-4 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <button
        type="button"
        onClick={locateMe}
        disabled={isLocating}
        className="mt-3 inline-flex items-center gap-2 text-sm text-primary disabled:opacity-60"
      >
        {isLocating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
        {isLocating ? "Getting current location..." : "Locate Me"}
      </button>

      {error ? <p className="mt-2 text-xs font-medium text-destructive">{error}</p> : null}

      {showResults ? (
        <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {isSearching ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching locations...
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No suggestions found.</div>
          ) : (
            results.map((result) => (
              <button
                type="button"
                key={result.place_id}
                onClick={() => selectLocation(result.display_name)}
                className="block w-full border-b border-border px-3 py-3 text-left text-sm text-foreground last:border-b-0 hover:bg-secondary"
              >
                {result.display_name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
