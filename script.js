'use strict';

// USING GEOLOCATION API:
// getCurrentPosition() method below, takes 2 callback functions. First one is a callback function that will be called on success, so when the browser successfully got
// the coordinates of the current position of the user and it is called with a position argument (the argument can have any name ofcourse) and the second callback is the
// error callback which is gonna be called when there happened an error while getting the coordinates:

// let map, mapEvent; // these will be set as private class fields in the App class as below:

class Workout {
  // This class will take in data that is common to both the workouts (running and cycling) and that is coordinates, distance and duration

  // We also want a date for each workout object:
  date = new Date();
  id = (Date.now() + '').slice(-10); // with this we provide a uniqui identifier to each object that we create. Date.now() gives us the current time stamp of right now
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // an array :- [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
    // this._setDescription(); //this should not be here but down in each of the child classes and that is because that's the class that contains type for the calculation
    //                           inside this method
  }

  _setDescription() {
    // this method is used to add description (For example 'Running on April 14' in the h2 tag in the html in the _renderWorkout() method below) to the html which will be
    // used to render the workouts on the sidebar in the UI

    // With the below comment, we can tell prettier to ignore he next line:
    // prettier-ignore
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

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

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

    // IN FORM IN THE SELECT ELEMENT WHEN WE SWITCH FROM RUNNING TO CYCLING, AN EVENT IS GENERATED AND CADENCE CHANGES TO ELEVATION GAIN AND ON SWITCHING BACK TO RUNNING,
    // IT AGAIN CHANGES TO CADENCE, FOR THAT WE ADD AN EVENT LISTENER AS BELOW:
    inputType.addEventListener('change', this._toggleElevationField); // the select element is stored in inputType variable and we listen for the change event on that
    //                                                                   rest of the functionality is in the handler function below:

    // containerWorkouts.addEventListener('click', this._moveToPopup.bind(this)); // Now, in our application, whever we click on a workout, we want the map to move to that
    // //                                                                            workout. So when we first load the application (i.e. in the initial stage), then no list
    // //                                                                            item is created so there are no workout items on which we can click. So in this
    // //                                                                            situation we don't actually have the element on which we want to attach the event
    // //                                                                            listener because it hasn't been created yet. So we do event delegation and add the event
    // //                                                                            handler to the parent element which is the element with .workouts class in the html and
    // //                                                                            we had stored this element in the containerWorkouts variable and so here we attach the
    // //                                                                            event handler to it and we add the event listener in the constructor() so that the event
    // //                                                                            listener is added right in the beginning

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
        // we have manually binded the this keyword to the_loadMap callback here because since it is a callback function, we do not call it ourselves, it is the
        // _getCurrentPosition() function that will call this callback function once that it gets the current position of the user and when it calls this callback
        // function, then it does so as a regular function call and in a regular function call, the this keyword is set to undefined so without binding the this keyword,
        // the this.#map = L.map('map').setView(coords, 13); will give error that cannot set property #map of undefined. Right now, this inside the bind() points to the
        // current object
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    // console.log(position); // this return a geolocation object containing a child coords object and a timestamp. The coords object further has many properties like
    //                           altitude, longitude, latitude, etc.

    const { latitude } = position.coords; // we used destructuring here and this will create a variable called latitude based out of the latitude property of the coords
    //                                       object

    const { longitude } = position.coords;
    // console.log(latitude, longitude); // with the help of these coordinates we will load the map and center the map on that position
    console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // BELOW, WE LOAD THE MAP FROM LEAFLET LIBRARY:
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // Whatever string that we pass into the map function, must be the id name of an element in our HTML and
    //                                                               it is in that element where the map will be displayed. What this means is that in our HTML, we need
    //                                                               and element with the id of a map, which we do have at the bottom. The 'L' here in tyhe starting is
    //                                                               the main function that leaflet gives us as an entry point, so it is kind of the namespace. setView()
    //                                                               will receive two parameters where the first parameter is an array of coordinates (the first element
    //                                                               of the array is latitude and the second element is longitude). Similarly, the marker() below also
    //                                                               receives this coords array. The second parameter in the setView() method is the zoom level, i.e.
    //                                                               initially how much zoomed in or zoomed out the map is wehn the page is loaded. Lower this value, the
    //                                                               more zoomed out the map is and vice versa.

    // NOTE :- L is a global variable in the leaflet script and hence we can access it here. So, any variable that is a global variable in any script will be available
    //         to all the other scripts while as long as they appear after that script included in the HTML. So, script.js has access to all the global variables in
    //         leaflet.js but leaflet.js does not have access to anything from script.js because script.js appears after leaflet.js in the HTML head tag. And the reason
    //         for that is, by the time leaflet.js is executed, script.js has not yet been loaded and therefore it doesn't find anything in the global scope

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      // tileLayer() is a method where we actually have to define the tiles of our map
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // HANDLING CLICKS ON MAP:
    this.#map.on('click', this._showForm.bind(this));
    // here map object was generated from the leaflet and it is the same one as we used above in the code. Now we have to add an event listener to the map() so that
    // wherever we click on the map we ge a marker. Now we can't just attach addEventListener() to the whole map because then we would have no way of knowing where
    // exactly the user clicked on the map. So basically we would have no way of knowing the GPS coordinates of whatever location the user clicked on the map because
    // that is data that only the map knows and so we need access to the coordinates of the point that we click. So we cannot just use the addEventListener() method.
    // Instead we use the on() method which is available on the leaflet library and not in JS. So now, storing the map in a variable was imp as this map object, which
    // was generated by leaflet, will now have now have a couple of methods and properties on it. We can take a look at this by doing console.log(map). Now, when
    // leaflet will call the callback function here, it will do so with a special map event and with the help of this event we can get the latitude and longitude of
    // wherever we click on the map. So now we can take this event object returned by the mapEvent, take the coordinates of latitude and longitude and then add a
    // marker at exactly that point

    // ADDING MARKERS, AFTER GETTING THE DATA FROM LOCAL STORAGE, ONCE THE MAP HAS BEEN LOADED
    this.#workouts.forEach(work => {
      // rendering the restored workouts on the list:
      this._renderWorkout(work);
      this._renderWorkoutMarker(work); // on doing this we get an error. This is because the _getLocalStorage method is executed right at the beginning i.e. right after the page is loaded. So here we are trying to add the merker to the map right at the beginning. However, at this point, the map has not actually been loaded. So essentially we are trying to add to marker to the map (above when we do .addTo(this.#map)) which isn't yet defined at this point and hence we get this error. So we add marker to the map once the map has been loaded and hence we can put this logic above in the _loadMap() method towards the end
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;

    form.classList.remove('hidden'); // when a click happens on map, then first we show the map then when form is submitted, marker is plpaced on map exactly where the
    //                                  click happened

    inputDistance.focus(); // as soon as the form is shown, the focus is on the Distance field.

    // We will add an addEventListener() to the form and when the form submits, we display the marker exactly where we clicked on the map
  }

  _hideForm() {
    // Empty inputs:
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none'; // Watch in video, if forgotten, that why we wrote this and the next 2 lines of code
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); //we work with the Elevation field element which has the .form__input--elevation class and
    //                                                                            is stored in inputElevation variable. Now the element which has the hidden class
    //                                                                            (.form__row--hidden) is the closest parent which also has the .form__row class. So we
    //                                                                            will toggle the hidden class both on the Elevation Gain and the Cadence. So the first
    //                                                                           thing we do is to select the closest parent with that form__row class and for that we use
    //                                                                           DOM traversal and the closest() method and then we toggle the .for_row--hidden class both
    //                                                                            on Elevation Gain and Cadence
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // whenever we use rest parameters (as in ...inpus), we get an array. So inputs is an array and we want to loop over this
    //                                              array and check if all of them are positive. Now there's already a predefined method in JS that is very helpful for
    //                                              that. So we have a method called every() which is used here. So this method will loop over the array and with each
    //                                              iteration it will check whether the element is finite or not and then in the end, the every() ethod will only return
    //                                              true if the condition defined (Number.isFinite(inp)) is true for all the elements in the array. But if the value was
    //                                              false for even one of the elements then every() will reurn false and so that will then be the return value of this
    //                                              arrow function

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // GET DATA FROM THE FORM:
    const type = inputType.value; // inputType is a select element but still we get the vlaue using the value property
    const distance = +inputDistance.value; // these always come as strings so we convert them to a number by using + in the front
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout; // any new workout object created will be stored in this variable

    // Now, we don't want to get Cadence and Elevation Gain in the beginning. The cadence we only want to get if it is a running workout and elevation gain we only want
    // to get if it is a cycling workout because that will then make it easier for us to validate the data

    // IF WORKOUT IS RUNNING, CREATE RUNNING OBJECT:
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // CHECK IF DATA IS VALID:
      // First of all, each of them should be a number:
      if (
        // we did this check here inside this if() block because if we did the same outside, above the // IF WORKOUT IS RUNNING, CREATE RUNNING OBJECT: comment then we
        // would also want to check for elevation. But only one of cadence and elevation can e defined at the same time and therefore performing this check would be a
        // little more difficult:

        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!'); // we use a guard clause here which basically means that we will basically check for the opposite of what we
      //                                                       are originally interested in and if that opposite id true then we simply return the function immediately

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // IF WORKOUT IS CYCLING, CREATE CYCLING OBJECT:
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // CHECK IF DATA IS VALID:
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration) // elevation can actually be negative, so we don't pass it here
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
    L.marker(workout.coords) // we can also display markers like this. The marker() will create the marker, addTo() will add it to the map,, bindPopup will create a popup
      //                          and bind it to the marker (instead of specifying a string in the bindPopup() we can also create a brand new popup object which will then
      //                          contain a couple of options, as we did)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false, // we added this property because by default, the popup of one marker closes when we create a new one and we want all the popups to remain
          //                   open
          closeOnClick: false, // this will prevent popups from closing whenever we click on the map
          className: `${workout.type}-popup`, // we use this to assign any CSS class name to our popup
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

    // Remove marker from map (optional - you'll need to keep track of markers)
    // This would require storing markers in an array when creating them
  }

  _moveToPopup(e) {
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout'); // e.target is the element that is clicked and then we look for the closest parent
    // from the above selected element, we can now get the id of the element from the data-id attribute and then use it to scroll to the
    // corresponding marker in the map

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      // this is an options object
      animate: true,
      pan: {
        //we can set the duration of this animation by doing pan equal to yet another object with duration property:
        duration: 1,
      },
    });

    // USING THE PUBLIC INTERFACE:
    // workout.click();
  }

  _setLocalStorage() {
    // USING LOCAL STORAGE API:
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // first argument is a name that we give it and the second argument needs to be a string that we
    //                                                                   want to store and which will be associated with the key (the name 'workouts' that we gave it)
    //                                                                   here. So basically local storage is a simple key-value store and so we need a key which is
    //                                                                  'workouts' here and we need a simple value which must also be a string, but we can convert an
    //                                                                   object to a string using JSON.stringify()
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); // now we do opposite of what we did in the _setLocalStorage() method, so now we use getItem() method here
    //                                                            and pass in the key which we set for our data and since the data is returned as string so we convert it
    //                                                            back to Object by using JSON.parse() and then we will get an array with an object for each workout

    if (!data) return; // if there is no data in local Storage, the function simply returns

    this.#workouts = data; // we restore our #workouts array with the data that we received from local storage. So essentially we are restoring the data here across
    //                        mulltiple reloads of the page

    this.#workouts.forEach(work => {
      // rendering the restored workouts on the list:
      this._renderWorkout(work);
      // this._renderWorkoutMarker(work); // on doing this we get an error. This is because the _getLocalStorage method is executed right at the beginning i.e. right
      //                                     after the page is loaded. So here we are trying to add the merker to the map right at the beginning. However, at this point,
      //                                     the map has not actually been loaded. So essentially we are trying to add to marker to the map (above when we do
      //                                     .addTo(this.#map)) which isn't yet defined at this point and hence we get this error. So we add marker to the map once the map
      //                                     has been loaded and hence we can put this logic above in the _loadMap() method towards the end
    });
  }

  reset() {
    // now this method is part of our public interface, so we can call it outside our class. Below, we create an object from App class and store it in app variable so this
    // method is present in the prototype of the app object. So in the console we can do app.reset() to delete the workouts from the local storage and hence the UI
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
// app._getPosition(); // Now this object is creted in the begining right when the page loads and the constructor() method is called immediately when we create a new
//                      object for the above App class and this app object here is created right in the beginning when the page loads so that means that the constructor()
//                        is also executed right in the beginning immediately as the loads. Also, to trigger the geolocation API, the _getPosition() method needs to be
//                        called and this too needs to be done immediately as the page loads. so instead of doing app._getPosition() here, we could do this._getPosition()
//                        inside the constructor as we did so. Similarly, we want the event listeners to be set right at the beginning, so when the script forst loads,
//                        but again, that should be inside of the class and so again, we put them too in the constructor()

// Now, when we convert our objects to a string and then back to object, we loose the prototype chain and hence the new objects that we recover from the local storage are now just regular objects. They are now no longer objects that were created by Running or by the Cycling class and so therefore, they were not able to inherit any of their methods and hence we get an error that workout.click is not a function anymore because now the object no longer has it in its prototype. So as now now to fix it we just cmment the functionaly of counting the clicks by commenting out the method call of workout.click()

// jghbfbbvvfghjrsvdosihfvyf
