import React, { useRef, useEffect, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import 'ol/ol.css';
import { useDrones } from '../drone-data-provider';
import { Feature } from 'ol';
import { LineString, Point } from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import { getLast } from '../../utils/array';
import Stroke from 'ol/style/Stroke';

export const OlMap: React.FC = () => {
  const drones = useDrones()
  const [map, setMap] = useState<Map>()
  const mapRef = useRef<HTMLDivElement>(null);

  const droneFeatures = drones.map(drone => {
    const currentPosition = getLast(getLast(drone.sessions)?.positions ?? [])
    const coords = fromLonLat([currentPosition?.latitude ?? 0, currentPosition?.longitude ?? 0]);

    const droneFeature = new Feature({
      geometry: new Point(coords),
    });
    
    droneFeature.setStyle(new Style({
      image: new Icon({
        anchor: [0.5, 1],
        scale: 0.02,
        src: '/assets/drone.png',
        rotation: currentPosition?.heading ?? 0
      }),
    }));

    return droneFeature
  })

  const dronePathFeatures = drones.map(drone => {
    const currentSession = getLast(drone.sessions)

    const path = currentSession?.positions.map(position => fromLonLat([position.latitude, position.longitude]))


    const lineFeature = new Feature({
      geometry: new LineString(path ?? []),
    });
    
    lineFeature.setStyle(new Style({
      stroke: new Stroke({
        color: 'red',
        width: 5,
      }),
    }));

    return lineFeature
  });

  const droneSource = new VectorSource({
    features: droneFeatures,
  });

  
  const droneLayer = new VectorLayer({
    source: droneSource,
  });

  const dronePathSource = new VectorSource({
    features: dronePathFeatures,
  });


  const dronePathLayer = new VectorLayer({
    source: dronePathSource,
  });

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: 'EPSG:3857',
      }),
    });

    setMap(map);
    return () => map.setTarget(undefined); 
  }, []);

  useEffect(() => {
    map?.removeLayer(dronePathLayer)
    map?.removeLayer(droneLayer)
    map?.addLayer(dronePathLayer)
    map?.addLayer(droneLayer)
  }, [droneFeatures, dronePathFeatures])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />
  );
};
