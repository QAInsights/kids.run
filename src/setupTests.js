import '@testing-library/jest-dom';

const localStorageMock = (function() {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    clear() {
      store = {};
    },
    removeItem(key) {
      delete store[key];
    }
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mocking window.google for our testing environment
global.window.google = {
  maps: {
    places: {
      Autocomplete: class {
        addListener() {}
        getPlace() { return {}; }
      }
    },
    DirectionsService: class {
      route(request, callback) {
        callback({ routes: [{ legs: [{ distance: { text: '5 mi' }, duration: { text: '10 mins' } }] }] }, 'OK');
      }
    },
    DirectionsRenderer: class {
      setDirections() {}
    },
    Map: class {},
    TravelMode: {
      DRIVING: 'DRIVING'
    },
    DirectionsStatus: {
      OK: 'OK'
    },
    event: {
      clearInstanceListeners: () => {}
    }
  }
};
