const directionLabels = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];

function randomRange(min, max, decimals = 1) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function generateDummyData() {
  const headingDeg = Math.floor(Math.random() * 360);
  const index = Math.round(headingDeg / 45) % 8;

  return {
    temperature: {
      outside: randomRange(5, 18),
      inside: randomRange(18, 25)
    },
    humidity: {
      outside: randomRange(45, 85),
      inside: randomRange(35, 65)
    },
    heading: {
      deg: headingDeg,
      cardinal: directionLabels[index]
    },
    distanceCm: randomRange(25, 240, 0),
    location: {
      lat: randomRange(47.95, 48.35, 5),
      lng: randomRange(16.15, 16.55, 5),
      source: Math.random() > 0.5 ? 'GPS + LoRa' : 'GPS Direct',
      accuracyM: randomRange(3, 15, 0)
    }
  };
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function render() {
  const data = generateDummyData();

  setText('tempOutside', `${data.temperature.outside} °C`);
  setText('tempInside', `${data.temperature.inside} °C`);
  setText('humOutside', `${data.humidity.outside} %`);
  setText('humInside', `${data.humidity.inside} %`);
  setText('heading', `${data.heading.deg}° (${data.heading.cardinal})`);
  setText('distance', `${data.distanceCm} cm`);

  setText('lat', data.location.lat);
  setText('lng', data.location.lng);
  setText('source', data.location.source);
  setText('accuracy', data.location.accuracyM);
}

render();
setInterval(render, 10000);
