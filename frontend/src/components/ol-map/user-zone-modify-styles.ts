import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';

export function getUserZoneModifyStyle(): Style {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#b45309', width: 2.5 }),
    }),
    zIndex: 1000,
  });
}

export function getUserZoneDrawStyle(): Style {
  return new Style({
    fill: new Fill({ color: 'rgba(234, 179, 8, 0.2)' }),
    stroke: new Stroke({ color: 'rgba(202, 138, 4, 0.95)', width: 2, lineDash: [6, 4] }),
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#b45309', width: 2 }),
    }),
  });
}
