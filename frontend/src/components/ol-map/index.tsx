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
import { useDroneSelection } from '../drone-selection-provider';

export const OlMap: React.FC = () => {
  const { drones } = useDrones()
  const dronesRef = useRef(drones);

  const {selectedDrone, setSelectedDrone, isDisplayOwned} = useDroneSelection()
    const [droneSource] = useState<VectorSource<Feature<Point>>>(new VectorSource({
    features: [],
  }))
  const [dronePathSource] = useState<  VectorSource<Feature<LineString>>  >(new VectorSource({
    features: [],
  }))

  const mapRef = useRef<HTMLDivElement>(null);

  const droneFeatures = drones.map(drone => {
    const currentPosition = getLast(getLast(drone.sessions)?.positions ?? [])
    const coords = fromLonLat([currentPosition?.latitude ?? 0, currentPosition?.longitude ?? 0]);

    const droneFeature = new Feature({
      geometry: new Point(coords),
    });

    droneFeature.set('droneId', drone.id)
    droneFeature.set('droneSerial', drone.serial)
    droneFeature.set('isExpired', false)


    if (currentPosition?.recordedAt){
    const now = Date.now();
    const then = new Date(currentPosition?.recordedAt).getTime();
    droneFeature.set('isExpired', (now - then) > 60_000)
    }

    droneFeature.setStyle(new Style({
      image: new Icon({
        anchor: [0.5, 1],
        scale: 0.02,
        src: '/assets/drone.png',
        rotation: currentPosition?.heading ?? 0,
        color: selectedDrone?.id === drone.id ? '#ffff00' : undefined, 
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
    
    lineFeature.set('droneId', drone.id)
    lineFeature.set('droneSerial', drone.serial)

    lineFeature.setStyle(new Style({
      stroke: new Stroke({
        color: 'red',
        width: 3,
      }),
    }));

    return lineFeature
  });

  useEffect(() => {
    dronesRef.current = drones;
  }, [drones])

  useEffect(() => {
    if (!mapRef.current) return;

    const droneLayer = new VectorLayer({
      source: droneSource,
    });

    const dronePathLayer = new VectorLayer({
      source: dronePathSource,
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        dronePathLayer,
        droneLayer,
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
        projection: 'EPSG:3857',
      }),
    });

    map.on('click', (evt) => {
      let isDroneClicked = false;
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const id = feature.get('droneId');
        const currentDrone = dronesRef.current.find(drone => drone.id === id)
        isDroneClicked = true;
        setSelectedDrone(currentDrone);
      });
      if (!isDroneClicked)
        setSelectedDrone(undefined)
    });

    return () => map.setTarget(undefined); 
  }, []);

  useEffect(() => {
    const ownedDrones: string[] = JSON.parse(localStorage.getItem('myDrones') ?? '[]')
    droneSource.clear()
    droneSource.addFeatures(droneFeatures.filter(drone => !drone.get('isExpired')  && (!isDisplayOwned || ownedDrones.includes(drone.get('droneSerial')))))
  
    dronePathSource.clear()
    dronePathSource.addFeatures(dronePathFeatures.filter(path => path.get('droneId') === selectedDrone?.id  && (!isDisplayOwned || ownedDrones.includes(path.get('droneSerial')))))  
  }, [droneFeatures, dronePathFeatures])

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />
  );
};
