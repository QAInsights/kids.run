import { useState, useEffect, useRef } from 'react';
import { Home, MapPin, Clock, Plus, Trash2, Navigation2, Map as MapIcon, Settings, Route as RouteIcon, Car, CheckCircle2, RotateCcw, Zap, Sun, Moon, Eye, EyeOff, Calendar, Bookmark, FileSpreadsheet, Map as MapViewIcon } from 'lucide-react';
import './index.css';

// Utility for formatting time
const formatTime = (time) => {
  if (!time) return "";
  if (time === "Start" || time === "End") return time;
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// Autocomplete Input Component
const PlaceInput = ({ value, onChange, placeholder, apiKey, icon, style, className }) => {
  const inputRef = useRef(null);
  
  // Bug fix: Safely sync value without overriding Places API mid-keystroke
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
        inputRef.current.value = value || "";
    }
  }, [value]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!apiKey || !window.google || !window.google.maps || !window.google.maps.places) return;
    if (inputRef.current && inputRef.current._hasAutocomplete) return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'name'],
    });
    
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const newAddress = place.formatted_address || place.name;
      if (newAddress) {
        onChangeRef.current(newAddress);
      }
    });

    if (inputRef.current) inputRef.current._hasAutocomplete = true;
    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
      if (inputRef.current) inputRef.current._hasAutocomplete = false;
    };
  }, [apiKey]); 

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {icon && <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>{icon}</div>}
      <input 
        ref={inputRef}
        className={`input ${className || ''}`}
        style={{ ...style, paddingLeft: icon ? '3.25rem' : '1.5rem' }} 
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};

// Pre-defined fallback locations feature
const initialSavedLocations = [
  { id: 1, name: "Volleyball", address: "" },
  { id: 2, name: "Dance Class", address: "" },
  { id: 3, name: "Piano Class", address: "" },
  { id: 4, name: "School", address: "" },
  { id: 5, name: "Library", address: "" },
  { id: 6, name: "Kroger", address: "" },
  { id: 7, name: "Costco", address: "" }
];

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("kidrun_api_key") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("kidrun_theme") || "dark");
  const [showSettings, setShowSettings] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  
  const [homeAddress, setHomeAddress] = useState("");
  const [routeDate, setRouteDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [savedLocations, setSavedLocations] = useState(() => {
    const local = localStorage.getItem("kidrun_saved_locations");
    return local ? JSON.parse(local) : initialSavedLocations;
  });

  const [kids, setKids] = useState([
    { id: 1, name: "Ava", color: "var(--primary)", activities: [] },
    { id: 2, name: "Ben", color: "var(--secondary)", activities: [] }
  ]);
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [tripPlan, setTripPlan] = useState(null);
  const [directionsResult, setDirectionsResult] = useState(null);
  const [routeError, setRouteError] = useState("");
  const [scheduleWarnings, setScheduleWarnings] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'timeline' or 'table'

  useEffect(() => {
    if (!apiKey) return;
    localStorage.setItem("kidrun_api_key", apiKey);
    if (document.querySelector('#google-maps-script')) {
      if (window.google?.maps?.places) setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("kidrun_theme", theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("kidrun_saved_locations", JSON.stringify(savedLocations));
  }, [savedLocations]);

  // Hook to render the map once directionsResult is available
  useEffect(() => {
    if (directionsResult && document.getElementById('map-canvas') && window.google?.maps) {
      const map = new window.google.maps.Map(document.getElementById('map-canvas'), {
        zoom: 12,
        center: { lat: 0, lng: 0 },
        disableDefaultUI: true,
        styles: theme === 'dark' ? [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ] : []
      });
      const renderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false,
      });
      renderer.setDirections(directionsResult);
    }
  }, [directionsResult, theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  /* Saved Locations Logic */
  const addSavedLocation = () => setSavedLocations([...savedLocations, { id: Date.now(), name: "New Location", address: "" }]);
  const removeSavedLocation = (id) => setSavedLocations(savedLocations.filter(loc => loc.id !== id));
  const updateSavedLocation = (id, field, value) => {
    setSavedLocations(savedLocations.map(loc => loc.id === id ? { ...loc, [field]: value } : loc));
  };


  /* Kids Logic */
  const addKid = () => {
    const colors = ["var(--primary)", "var(--secondary)", "var(--accent)", "var(--success)"];
    const color = colors[kids.length % colors.length];
    setKids([...kids, { id: Date.now(), name: `Child ${kids.length + 1}`, color, activities: [] }]);
  };

  const removeKid = (id) => setKids(kids.filter(k => k.id !== id));
  const updateKidName = (id, name) => setKids(kids.map(k => k.id === id ? { ...k, name } : k));

  const addActivity = (kidId) => {
    setKids(kids.map(k => k.id === kidId ? {
      ...k, activities: [...k.activities, { id: Date.now(), name: "Activity", location: "", savedLocationId: "custom", startTime: "16:00", endTime: "17:00" }]
    } : k));
  };

  const updateActivity = (kidId, activityId, field, value) => {
    setKids(kids.map(k => k.id === kidId ? {
      ...k, activities: k.activities.map(a => a.id === activityId ? { ...a, [field]: value } : a)
    } : k));
  };

  const removeActivity = (kidId, activityId) => {
    setKids(kids.map(k => k.id === kidId ? { ...k, activities: k.activities.filter(a => a.id !== activityId) } : k));
  };

  const handleLocationChange = (kidId, actId, val) => {
     if (val === "custom") {
        updateActivity(kidId, actId, 'savedLocationId', null);
     } else {
        const loc = savedLocations.find(l => l.id.toString() === val.toString());
        if (loc) {
           updateActivity(kidId, actId, 'savedLocationId', loc.id);
           updateActivity(kidId, actId, 'name', loc.name);
           updateActivity(kidId, actId, 'location', loc.address);
        }
     }
  };

  const generateRoute = () => {
    setIsOptimizing(true);
    setRouteError("");
    setScheduleWarnings([]);
    setDirectionsResult(null);

    let allStops = [];
    kids.forEach(kid => {
      kid.activities.forEach(act => {
        if (!act.location) return;
        allStops.push({ type: 'dropoff', kid: kid.name, color: kid.color, ...act, time: act.startTime });
        allStops.push({ type: 'pickup', kid: kid.name, color: kid.color, ...act, time: act.endTime });
      });
    });

    allStops.sort((a, b) => a.time.localeCompare(b.time));

    if (allStops.length === 0 || !homeAddress) {
      setIsOptimizing(false);
      setRouteError("Please enter a valid Home address and ensure at least one activity has a location.");
      return;
    }

    if (scriptLoaded && apiKey && window.google?.maps?.DirectionsService) {
      const directionsService = new window.google.maps.DirectionsService();
      
      const waypoints = allStops.map(stop => ({
        location: stop.location,
        stopover: true
      }));

      directionsService.route({
        origin: homeAddress,
        destination: homeAddress,
        waypoints: waypoints,
        optimizeWaypoints: false, 
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
           buildPlanFromDirections(result, allStops);
        } else {
           setRouteError(`Google Maps failed with status: ${status}. Using standard timeline offline...`);
           buildHeuristicPlan(allStops);
        }
      });
    } else {
      setTimeout(() => buildHeuristicPlan(allStops), 800);
    }
  };

  const buildPlanFromDirections = (result, allStops) => {
     setDirectionsResult(result);
     const legs = result.routes[0].legs;
     
     const plan = [];
     plan.push({ phase: 'Depart Home', kidName: 'Basecamp', location: homeAddress, time: 'Start', desc: 'Begin route', icon: <Home size={18} color="#fff" />, color: "var(--success)" });

     let currentLegIdx = 0;
     let warnings = [];

     allStops.forEach((stop, idx) => {
        const isDropoff = stop.type === 'dropoff';
        const leg = legs[currentLegIdx];
        
        let isClashing = false;
        let clashText = null;
        if (idx > 0) {
            const prevStop = allStops[idx - 1];
            const [pH, pM] = prevStop.time.split(':').map(Number);
            const [cH, cM] = stop.time.split(':').map(Number);
            const diffMins = ((cH * 60) + cM) - ((pH * 60) + pM);
            const driveMins = Math.ceil(leg.duration.value / 60);

            if (driveMins > diffMins) {
                isClashing = true;
                clashText = `Late by ${driveMins - diffMins}m!`;
                warnings.push(`Schedule clash for ${stop.kid} at ${formatTime(stop.time)}: Driving from previous stop takes ${driveMins} mins, but gap is only ${diffMins} mins.`);
            }
        }
        
        plan.push({
          phase: 'Drive', kidName: '', location: '', time: '', desc: `Drive ${leg.distance.text} (${leg.duration.text})`,
          icon: <Car size={18} className="text-muted" />, isDrive: true, color: "var(--surface)"
        });

        plan.push({
          phase: isDropoff ? `Drop off ${stop.kid}` : `Pick up ${stop.kid}`, kidName: stop.kid,
          location: stop.location, time: stop.time, isClashing, clashText,
          desc: `${stop.name} ${isDropoff ? 'starts' : 'ends'} at ${formatTime(stop.time)}`,
          icon: isDropoff ? <RouteIcon size={18} color="#fff" /> : <CheckCircle2 size={18} color="#fff" />,
          color: stop.color
        });
        currentLegIdx++;
     });

     const finalLeg = legs[currentLegIdx];
     plan.push({
          phase: 'Drive', kidName: '', location: '', time: '', desc: `Return home: ${finalLeg.distance.text} (${finalLeg.duration.text})`,
          icon: <Car size={18} className="text-muted" />, isDrive: true, color: "var(--surface)"
     });
     plan.push({
        phase: 'Return Home', kidName: 'Basecamp', location: homeAddress, time: 'End', desc: 'End of trip',
        icon: <Home size={18} color="#fff" />, color: "var(--success)"
     });

     setTripPlan(plan);
     setScheduleWarnings(warnings);
     setIsOptimizing(false);
  };

  const buildHeuristicPlan = (allStops) => {
      const plan = [];
      plan.push({ phase: 'Depart Home', kidName: 'Basecamp', location: homeAddress || 'Home Address', time: 'Start', desc: 'Start route', icon: <Home size={18} color="#fff" />, color: "var(--success)" });

      allStops.forEach((stop, index) => {
        const isDropoff = stop.type === 'dropoff';
        plan.push({
          phase: isDropoff ? `Drop off ${stop.kid}` : `Pick up ${stop.kid}`, kidName: stop.kid,
          location: stop.location || `${stop.name} Location`, time: stop.time,
          desc: `${stop.name} ${isDropoff ? 'starts' : 'ends'} at ${formatTime(stop.time)}`,
          icon: isDropoff ? <RouteIcon size={18} color="#fff" /> : <CheckCircle2 size={18} color="#fff" />,
          color: stop.color
        });

        if (index < allStops.length - 1) {
          plan.push({
            phase: 'Drive', kidName: '', location: '', time: '', desc: 'Est. 15 mins travel (Google Maps off)',
            icon: <Car size={18} className="text-muted" />, isDrive: true, color: "var(--surface)"
          });
        }
      });

      plan.push({ phase: 'Return Home', kidName: 'Basecamp', location: homeAddress || 'Home Address', time: 'End', desc: 'End of route', icon: <Home size={18} color="#fff" />, color: "var(--success)" });

      setTripPlan(plan);
      setIsOptimizing(false);
  };

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div style={{ paddingBottom: '6rem' }}>
      
      <header style={{ paddingTop: '3rem', paddingBottom: '2rem' }}>
        <div className="container flex justify-between items-center" style={{ maxWidth: '1500px' }}>
          <div className="flex items-center gap-3">
            <div style={{ 
              backgroundColor: 'var(--primary)', color: '#fff', 
              padding: '0.6rem', borderRadius: '1rem',
              boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
            }}>
              <MapIcon size={26} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold" style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
              Kids<span style={{color:'var(--primary)'}}>.</span>Run
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <button className="btn-ghost" onClick={() => setShowSettings(!showSettings)}>
              <Settings size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard">
        
        <div className="setup-col flex-col gap-6" style={{ display: 'flex' }}>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="card animate-slide-up" style={{ border: '2px solid var(--primary)', marginBottom: '1rem' }}>
              <h3 className="font-bold text-xl flex items-center gap-2 mb-4 text-primary" style={{color: 'var(--primary)', fontFamily: 'var(--font-display)'}}>
                <Zap size={20} /> Configure Route Engine
              </h3>
              <div className="input-group">
                <label className="input-label flex items-center gap-2" style={{color: 'var(--primary)'}}>
                  Google Maps API Key 
                  <span className="pill" style={{ backgroundColor: apiKey && scriptLoaded ? 'var(--success)' : 'transparent', color: apiKey && scriptLoaded ? '#fff' : 'var(--primary)', border: apiKey && scriptLoaded ? 'none' : '2px solid var(--primary)' }}>
                    {apiKey && scriptLoaded ? "Key Active" : "No Key Detected"}
                  </span>
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input 
                    className="input" 
                    type={showApiKey ? "text" : "password"} 
                    placeholder="AIzaSy..." 
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)} 
                    style={{ paddingRight: '3rem' }}
                  />
                  <button 
                    className="btn-ghost" 
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', padding: '0.5rem', color: 'var(--text-muted)' }}
                    title={showApiKey ? "Hide Key" : "Show Key"}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span className="text-xs mt-1" style={{color: 'var(--primary)', opacity: 0.8}}>Requires Maps JavaScript API & Places API enabled. Key is saved locally to your browser.</span>
              </div>
            </div>
          )}

          {/* Section: Basecamp */}
          <section className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-blob" style={{ backgroundColor: 'var(--success)' }}></div>
            <h2 className="text-xl font-bold flex items-center gap-3 mb-5" style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-display)' }}>
              <span style={{ color: 'var(--success)', padding: '0.4rem', backgroundColor: 'var(--success-light)', borderRadius: '0.75rem' }}>
                <Home size={22} />
              </span>
              Basecamp
            </h2>
            <div className="flex gap-4">
              <div className="input-group" style={{ position: 'relative', zIndex: 1, marginBottom: 0, flex: 2 }}>
                <label className="input-label">
                  Starting Address 
                  {scriptLoaded && <span style={{ color: 'var(--success)', fontSize: '0.75rem', marginLeft: '0.5rem', textTransform: 'none' }}>Autocomplete active</span>}
                </label>
                <PlaceInput 
                  value={homeAddress} onChange={setHomeAddress} placeholder="e.g. 123 Family Lane..."
                  apiKey={apiKey && scriptLoaded ? apiKey : null}
                  icon={<MapPin size={20} className="text-muted" />}
                />
              </div>
              <div className="input-group" style={{ position: 'relative', zIndex: 1, marginBottom: 0, flex: 1 }}>
                <label className="input-label">Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={20} className="text-muted" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
                  <input 
                    className="input" type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} 
                    style={{ paddingLeft: '3.25rem' }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Saved Locations Manager */}
          <section className="card animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex justify-between items-center mb-4 px-1" style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="text-xl font-bold flex items-center gap-2" style={{fontFamily: 'var(--font-display)'}}>
                <Bookmark size={22} className="text-primary" /> Saved Locations
              </h2>
              <button className="btn-ghost" onClick={addSavedLocation} style={{ color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} strokeWidth={3} /> Add
              </button>
            </div>
            
            <div className="flex-col gap-4" style={{ display: 'flex' }}>
              {savedLocations.map(loc => (
                <div key={loc.id} className="flex gap-2 items-center">
                  <input 
                    className="input" style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.9rem' }} 
                    placeholder="E.g. Costco" value={loc.name}
                    onChange={e => updateSavedLocation(loc.id, 'name', e.target.value)}
                  />
                  <div style={{ flex: 2 }}>
                    <PlaceInput 
                      value={loc.address} onChange={(val) => updateSavedLocation(loc.id, 'address', val)}
                      placeholder="Associated Address" apiKey={apiKey && scriptLoaded ? apiKey : null}
                      style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}
                    />
                  </div>
                  <button className="btn-ghost text-muted hover:text-danger" onClick={() => removeSavedLocation(loc.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Kids & Activities */}
          <section className="animate-slide-up" style={{ animationDelay: '0.2s', marginTop: '1rem' }}>
            <div className="flex justify-between items-end mb-6 px-1">
              <h2 className="text-2xl font-bold" style={{fontFamily: 'var(--font-display)'}}>The Squad</h2>
              <button className="btn-ghost" onClick={addKid} style={{ color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} strokeWidth={3} /> Add Child
              </button>
            </div>

            <div className="flex-col gap-5" style={{ display: 'flex' }}>
              {kids.map((kid) => (
                <div key={kid.id} className="card" style={{ padding: '0' }}>
                  <div className="bg-blob" style={{ backgroundColor: kid.color }}></div>
                  
                  <div style={{ padding: '1.5rem 1.5rem 0', position: 'relative', zIndex: 1 }}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3 w-full">
                        <div style={{ backgroundColor: kid.color, width: '16px', height: '16px', borderRadius: '50%' }}></div>
                        <input 
                          className="input text-2xl font-bold" 
                          value={kid.name} 
                          onChange={e => updateKidName(kid.id, e.target.value)} 
                          style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none', color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}
                        />
                      </div>
                      <button className="btn-ghost text-muted hover:text-danger" onClick={() => removeKid(kid.id)}>
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-col gap-0" style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
                    {kid.activities.map((act) => (
                      <div key={act.id} style={{ 
                        padding: '1.5rem', 
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        <div className="flex-col gap-3" style={{ display: 'flex' }}>
                          
                          <div className="flex gap-3">
                            <div style={{ flex: 1, position: 'relative' }}>
                              <RouteIcon size={18} className="text-muted" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
                              <input 
                                className="input" style={{ paddingLeft: '3.25rem' }} 
                                placeholder="Activity Name" value={act.name}
                                onChange={e => updateActivity(kid.id, act.id, 'name', e.target.value)}
                              />
                            </div>
                            <button className="btn-outline" onClick={() => removeActivity(kid.id, act.id)} style={{ padding: '0 1rem', borderRadius: 'var(--radius-full)' }}>
                              <Trash2 size={18} className="text-muted" />
                            </button>
                          </div>

                          <div className="flex-col gap-2" style={{display: 'flex'}}>
                            <div style={{ position: 'relative' }}>
                              <MapPin size={18} className="text-muted" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
                              <select 
                                className="input" 
                                style={{ paddingLeft: '3.25rem', appearance: 'none', color: act.savedLocationId ? 'var(--text-main)' : 'var(--text-muted)' }} 
                                value={act.savedLocationId || "custom"} 
                                onChange={e => handleLocationChange(kid.id, act.id, e.target.value)}
                              >
                                <option value="custom">Use Custom Address...</option>
                                <optgroup label="Saved Locations">
                                  {savedLocations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} {loc.address ? `(${loc.address})` : ''}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>

                            {(!act.savedLocationId || act.savedLocationId === "custom") && (
                              <PlaceInput 
                                 value={act.location} onChange={(val) => updateActivity(kid.id, act.id, 'location', val)}
                                 placeholder="Type Custom Address" apiKey={apiKey && scriptLoaded ? apiKey : null}
                                 icon={<Zap size={16} className="text-accent" />}
                              />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center flex-1 bg-transparent border-2 rounded-full overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                              <div style={{ padding: '0.8rem', backgroundColor: 'var(--bg-color)', borderRight: '2px solid var(--border-color)' }}>
                                <Clock size={18} className="text-muted" />
                              </div>
                              <input type="time" className="input" style={{ border: 'none', borderRadius: 0, padding: '0.8rem' }} value={act.startTime} onChange={e => updateActivity(kid.id, act.id, 'startTime', e.target.value)} />
                              <span className="font-bold text-muted px-2">to</span>
                              <input type="time" className="input" style={{ border: 'none', borderRadius: 0, padding: '0.8rem' }} value={act.endTime} onChange={e => updateActivity(kid.id, act.id, 'endTime', e.target.value)} />
                            </div>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '1rem 1.5rem 1.5rem', borderTop: kid.activities.length > 0 ? '1px solid var(--border-color)' : 'none' }}>
                    <button className="btn-ghost w-full" onClick={() => addActivity(kid.id)} style={{ color: kid.color, backgroundColor: 'transparent', border: `2px dashed var(--border-color)` }}>
                      <Plus size={18} /> Add Activity
                    </button>
                  </div>
                </div>
              ))}
              
              {kids.length === 0 && (
                <div className="card text-center flex-col items-center justify-center" style={{ padding: '4rem 2rem', backgroundColor: 'transparent', boxShadow: 'none' }}>
                  <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    <Car size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{fontFamily: 'var(--font-display)'}}>No kids in the squad!</h3>
                  <p className="text-muted">Add a child to start building their itinerary.</p>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '1.25rem', fontSize: '1.15rem' }}
                onClick={generateRoute}
                disabled={isOptimizing || kids.length === 0}
              >
                {isOptimizing ? 'Optimizing Route...' : <><Navigation2 size={22} fill="currentColor" /> Generate Trip Plan</>}
              </button>
            </div>
            
            {routeError && (
              <div className="card animate-slide-up" style={{ marginTop: '1rem', borderColor: 'var(--danger)', backgroundColor: 'var(--surface-hover)' }}>
                <p className="font-bold text-danger">{routeError}</p>
              </div>
            )}
            
          </section>
        </div>

        {/* Plan Column */}
        <div className="plan-col">
          {tripPlan ? (
            <section className="card animate-slide-up" style={{ padding: '2.5rem', backgroundColor: 'var(--text-main)', color: 'var(--bg-color)', position: 'sticky', top: '2rem' }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-2" style={{fontFamily: 'var(--font-display)'}}>
                    <span style={{ color: 'var(--success)' }}>
                      <CheckCircle2 size={28} />
                    </span>
                    The Master Plan
                  </h2>
                  <span className="pill" style={{backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--bg-color)'}}>
                    {formatDateLabel(routeDate)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => setViewMode(viewMode === 'table' ? 'timeline' : 'table')} style={{ color: 'var(--bg-color)', opacity: 0.7 }} title="Toggle View Mode">
                    {viewMode === 'table' ? <MapViewIcon size={20} /> : <FileSpreadsheet size={20} />}
                  </button>
                  <button className="btn-ghost" onClick={() => { setTripPlan(null); setDirectionsResult(null); }} style={{ color: 'var(--bg-color)', opacity: 0.7 }} title="Reset Plan">
                    <RotateCcw size={20} />
                  </button>
                </div>
              </div>

              {scheduleWarnings.length > 0 && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', color: 'var(--danger)' }}>
                   <h4 className="font-bold flex items-center gap-2 mb-2"><Zap size={18}/> Schedule Impossibilities Detected</h4>
                   <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                      {scheduleWarnings.map((w, i) => <li key={i}>{w}</li>)}
                   </ul>
                </div>
              )}

              {directionsResult && (
                 <div id="map-canvas" style={{ width: '100%', height: '300px', borderRadius: '1.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}></div>
              )}

              {viewMode === 'table' ? (
                <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface)', color: 'var(--text-main)', borderRadius: '1rem', padding: '1rem' }}>
                  <table className="plan-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>Who</th>
                        <th>Location / Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tripPlan.map((step, idx) => (
                        <tr key={idx} style={step.isDrive ? { opacity: 0.7, fontSize: '0.85rem' } : {}}>
                          <td style={{ fontWeight: '700', color: step.isDrive ? 'var(--text-muted)' : (step.isClashing ? 'var(--danger)' : step.color) }}>
                             {step.isDrive ? '' : formatTime(step.time)}
                             {step.isClashing && <span style={{display:'block', fontSize:'0.7rem', fontWeight:800}}>⚠️ CLASH</span>}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            <div className="flex items-center gap-2">
                              {step.icon} {step.isDrive ? 'Drive' : step.phase}
                            </div>
                          </td>
                          <td>{step.kidName}</td>
                          <td>
                            {step.isDrive ? step.desc : step.location}
                            {step.isClashing && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.2rem' }}>{step.clashText}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="timeline">
                  {tripPlan.map((step, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" style={{ 
                          backgroundColor: step.isDrive ? 'transparent' : step.color,
                          boxShadow: step.isDrive ? 'none' : `0 0 0 4px var(--text-main)`
                        }}>
                        {!step.isDrive && step.icon}
                      </div>
                      
                      {step.isDrive ? (
                        <div style={{ marginLeft: '1.5rem', padding: '0', opacity: 0.6 }}>
                          <p className="font-bold flex items-center gap-2 text-sm">
                            <Car size={16} /> {step.desc}
                          </p>
                        </div>
                      ) : (
                        <div className="card" style={{ 
                          marginLeft: '1rem', padding: '1.5rem', marginBottom: '0', 
                          backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)',
                          color: 'var(--bg-color)'
                        }}>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h4 className="font-bold text-lg">{step.phase}</h4>
                              <p className="text-sm mt-1" style={{opacity: 0.8}}><MapPin size={14} className="inline mr-1" />{step.location}</p>
                            </div>
                            <div className="font-bold text-xl" style={{ color: step.color, fontFamily: 'var(--font-display)' }}>
                              {formatTime(step.time)}
                            </div>
                          </div>
                          <p className="font-bold text-sm mt-3" style={{opacity: 0.7}}>{step.desc}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="card flex-col items-center justify-center text-center" style={{ padding: '6rem 2rem', opacity: 0.5, border: '2px dashed var(--border-color)', position: 'sticky', top: '2rem' }}>
              <FileSpreadsheet size={48} className="text-muted mb-4" />
              <h3 className="text-xl font-bold" style={{fontFamily: 'var(--font-display)'}}>No Route Generated</h3>
              <p className="text-muted mt-2">Set up your squad and Hit 'Generate Trip Plan' to see your timeline and table here.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
