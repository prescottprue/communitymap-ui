import React, { useMemo } from 'react';
import GoogleMapReact from 'google-map-react';

const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';

const PinImg = () => (
  <img style={{ display: 'block' }} alt="here" src="/pin.png" />
);

export const MapItem: React.FC<{ lat: number; lng: number }> = ({
  children,
}) => <>{children}</>;

const defaultProps = {
  defaultCenter: { lat: 42.69, lng: 23.32 },
  defaultZoom: 18,
  defaultOptions: {
    overviewMapControl: true,
    streetViewControl: true,
    rotateControl: true,
    mapTypeControl: true,
    styles: [],
  },
};

interface MapsProps {
  centerLat?: number;
  centerLng?: number;
  onChange: (
    centerLat: number,
    centerLng: number,
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number
  ) => void;
}

export const Maps: React.FC<MapsProps> = ({
  children,
  centerLat,
  centerLng,
  onChange,
}) => {
  const center = useMemo(() => {
    if (!centerLat || !centerLng) return undefined;
    return { lat: centerLat, lng: centerLng };
  }, [centerLat, centerLng]);
  return (
    <>
      <div id="center-pin">
        <PinImg />
      </div>
      <GoogleMapReact
        {...defaultProps}
        bootstrapURLKeys={{ key: GOOGLE_API_KEY }}
        center={center}
        onChange={(props) => {
          const {
            center,
            bounds: { sw, ne },
          } = props;
          console.debug('GoogleMaps onChange', props);
          onChange(center.lat, center.lng, sw.lat, ne.lat, sw.lng, ne.lng);
        }}
      >
        {children}
      </GoogleMapReact>
    </>
  );
};
