import React, { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUserLocations, setCurrentLocation, fetchLocations } from '../../store/slices/locationSlice';
import LocationSelectionDialog from './LocationSelectionDialog';
import { Location } from '../../store/slices/locationSlice';

interface LocationProviderProps {
  children: React.ReactNode;
}

const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { locations, availableLocations, currentLocation, hasNoAssignment, loading } = useAppSelector((state) => state.locations);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [hasCheckedLocation, setHasCheckedLocation] = useState(false);

  // Lade alle Standorte beim Mount
  useEffect(() => {
    if (isAuthenticated && locations.length === 0) {
      dispatch(fetchLocations());
    }
  }, [isAuthenticated, dispatch, locations.length]);

  // Prüfe Standortauswahl nach Login
  useEffect(() => {
    if (isAuthenticated && user && !hasCheckedLocation && locations.length > 0 && !currentLocation) {
      setHasCheckedLocation(true);
      
      // Lade User-Standorte
      dispatch(fetchUserLocations()).then((result) => {
        if (fetchUserLocations.fulfilled.match(result)) {
          const { locations: userLocations, primaryLocation, hasNoAssignment: noAssignment } = result.payload;
          
          // Konvertiere zu Location-Objekten
          const availableLocs = locations.filter(loc => 
            userLocations.some(ul => ul._id === loc._id)
          );
          
          // Wenn keine Zuweisung, alle Standorte verfügbar
          const finalAvailableLocs = noAssignment ? locations : availableLocs;
          
          // Prüfe ob Standortauswahl nötig ist
          const savedLocationId = localStorage.getItem('currentLocationId');
          let locationToSet: Location | null = null;
          
          if (savedLocationId && finalAvailableLocs.find(loc => loc._id === savedLocationId)) {
            // Verwende gespeicherten Standort
            locationToSet = finalAvailableLocs.find(loc => loc._id === savedLocationId) || null;
          } else if (primaryLocation && finalAvailableLocs.find(loc => loc._id === primaryLocation)) {
            // Verwende Primary Location
            locationToSet = finalAvailableLocs.find(loc => loc._id === primaryLocation) || null;
          } else if (finalAvailableLocs.length === 1) {
            // Nur ein Standort → automatisch wählen
            locationToSet = finalAvailableLocs[0];
          } else if (finalAvailableLocs.length > 1) {
            // Mehrere Standorte → Dialog anzeigen
            setShowLocationDialog(true);
            return; // Warte auf Benutzerauswahl
          }
          
          // Setze Standort
          if (locationToSet) {
            dispatch(setCurrentLocation(locationToSet));
          }
        }
      });
    }
  }, [isAuthenticated, user, hasCheckedLocation, locations, currentLocation, dispatch]);

  const handleLocationSelect = (locationId: string, remember: boolean) => {
    const selectedLocation = availableLocations.find(loc => loc._id === locationId) || 
                            locations.find(loc => loc._id === locationId);
    
    if (selectedLocation) {
      dispatch(setCurrentLocation(selectedLocation));
      if (remember) {
        localStorage.setItem('currentLocationId', locationId);
      }
      setShowLocationDialog(false);
    }
  };

  const handleDialogClose = () => {
    // Wenn Dialog geschlossen wird ohne Auswahl, verwende ersten verfügbaren Standort
    if (availableLocations.length > 0) {
      const firstLocation = availableLocations[0];
      dispatch(setCurrentLocation(firstLocation));
      localStorage.setItem('currentLocationId', firstLocation._id);
    } else if (locations.length > 0) {
      const firstLocation = locations[0];
      dispatch(setCurrentLocation(firstLocation));
      localStorage.setItem('currentLocationId', firstLocation._id);
    }
    setShowLocationDialog(false);
  };

  // Zeige Dialog nur wenn mehrere Standorte verfügbar sind
  const shouldShowDialog = showLocationDialog && (availableLocations.length > 1 || (hasNoAssignment && locations.length > 1));

  // Berechne verfügbare Standorte für Dialog
  const dialogLocations = availableLocations.length > 0 ? availableLocations : locations;
  
  // Finde Primary Location ID aus Redux State (wird von fetchUserLocations gesetzt)
  const primaryLocationId = useMemo(() => {
    // Primary Location wird im Redux State gespeichert, hier verwenden wir einfach den ersten verfügbaren
    // Die tatsächliche Primary Location wird im locationSlice gesetzt
    return null; // Wird vom Dialog selbst bestimmt
  }, []);

  return (
    <>
      {children}
      {shouldShowDialog && (
        <LocationSelectionDialog
          open={shouldShowDialog}
          locations={dialogLocations}
          primaryLocationId={primaryLocationId}
          hasNoAssignment={hasNoAssignment}
          onSelect={handleLocationSelect}
          onClose={handleDialogClose}
        />
      )}
    </>
  );
};

export default LocationProvider;

