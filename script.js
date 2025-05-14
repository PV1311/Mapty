'use strict';


class Workout {
 
  date = new Date();
  id = (Date.now() + '').slice(-10); 
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // an array :- [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // GET USER'S POSITION:
    this._getPosition();

    // GET DATA FROM LOCAL STORAGE:
    this._getLocalStorage();

    // ADDING addEventListener() to form for submitting: (pressing enter also triggers form submit):
    form.addEventListener('submit', this._newWorkout.bind(this));

    // IN FORM IN THE SELECT ELEMENT WHEN WE SWITCH FROM RUNNING TO CYCLING, AN EVENT IS GENERATED AND CADENCE CHANGES TO ELEVATION GAIN AND ON SWITCHING BACK TO
    // RUNNING, IT AGAIN CHANGES TO CADENCE, FOR THAT WE ADD AN EVENT LISTENER AS BELOW:
    inputType.addEventListener('change', this._toggleElevationField); 

    containerWorkouts.addEventListener('click', e => {
      if (e.target.classList.contains('workout__delete')) {
        this._deleteWorkout(e);
      } else {
        this._moveToPopup(e);
      }
    });
  }

  _getPosition() {
    if (navigator.geolocation)
      // We do this if() to make sure that we don't get any errors in an old browser
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {

    const { latitude } = position.coords;
    const { longitude } = position.coords;
   
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // BELOW, WE LOAD THE MAP FROM LEAFLET LIBRARY:
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); 

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      // tileLayer() is a method where we actually have to define the tiles of our map
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // HANDLING CLICKS ON MAP:
    this.#map.on('click', this._showForm.bind(this));

    // ADDING MARKERS, AFTER GETTING THE DATA FROM LOCAL STORAGE, ONCE THE MAP HAS BEEN LOADED
    this.#workouts.forEach(work => {
      // rendering the restored workouts on the list:
      this._renderWorkout(work);
      this._renderWorkoutMarker(work); 
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;

    form.classList.remove('hidden');

    inputDistance.focus(); 

  }

  _hideForm() {
    // Empty inputs:
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none'; 
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); 
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); 
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // GET DATA FROM THE FORM:
    const type = inputType.value; 
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout; 

    // IF WORKOUT IS RUNNING, CREATE RUNNING OBJECT:
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!'); 

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // IF WORKOUT IS CYCLING, CREATE CYCLING OBJECT:
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // CHECK IF DATA IS VALID:
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration) 
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // ADD NEW OBJECT TO WORKOUT ARRAY:
    this.#workouts.push(workout);

    // RENDER WORKOUT ON MAP AS A MARKER:
    this._renderWorkoutMarker(workout);

    // RENDER WORKOUT ON LIST:
    this._renderWorkout(workout);

    // HIDE FORM + CLEAR INPUT FIELDS:
    this._hideForm();

    // ADD LOCAL STORAGE TO ALL WORKOUTS:
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false, 
          className: `${workout.type}-popup`, 
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      ) // to set the content of the popup
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <span class="workout__delete">&times;</span>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _deleteWorkout(e) {
    // Prevent event from bubbling up to the parent (which would trigger _moveToPopup)
    e.stopPropagation();

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    // Get workout ID from data attribute
    const workoutId = workoutEl.dataset.id;

    // Remove workout from array
    this.#workouts = this.#workouts.filter(work => work.id !== workoutId);

    // Update local storage
    this._setLocalStorage();

    // Remove workout from UI
    workoutEl.remove();
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      // this is an options object
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    // USING LOCAL STORAGE API:
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); 
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); 

    if (!data) return; 

    this.#workouts = data; 

    this.#workouts.forEach(work => {
      // rendering the restored workouts on the list:
      this._renderWorkout(work);
     
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
