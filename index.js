/**
 * Name: Mike Murphy
 * Date: 10/24/2023
 * Class: AD 320
 * Instructor: Tim Mandzyuk
 * 
 * This is the Javascript file for my CP2 project.  The project is a game which uses
 * the Stroop language interference effect to attempt to give the user an indication
 * of how fluent they are at reading a particular language (at least color words in
 * that language) by measuring the delay in reaction time and increase in errors when
 * attempting to name the color of the font that a color word is written in rather 
 * than the color named by the semantic meaning of the displayed word.  
 * 
 * According to the Stroop interference theory, the better a given person understands
 * the semantic meaning of a given printed word, the more difficult it is to respond correctly
 * and quickly to a prompt where the physical characteristics of the presented text
 * conflict with the meaning of the written prompt.
 * 
 * There is a baseline mode which allows the user to test their standard non-interference
 * performance before running the test again with a choice between five different
 * test and response languages.
 */
"use strict";

(function() {

    // Magic numbers and tracker variables
    const TIMER_START = 30;

    const BASE_URL_LANG_LIST='https://translation.googleapis.com/language/translate/v2/languages';
    const API_KEY='key=AIzaSyAJpMtRCwKOZU3JvrMMf6qo398bz6BcWt4';

    let languages = ['None']; //["None","English","Spanish","German","Russian","Chinese"];
    let lang_codes = ['--'];
    const COLOR_NAMES = ["BLUE","RED","YELLOW","BLACK","PURPLE","GREEN","ORANGE"];

    const COLOR_WORDS = [["███","███","███","███","███","███","███"],
                         ["BLUE","RED","YELLOW","BLACK","PURPLE","GREEN","ORANGE"],
                         ["AZUL","ROJO","AMARILLO","NEGRO","MORADO","VERDE","ANARANJADO"],
                         ["BLAU","ROT","GELB","SCHWARZ","PURPUR","GRÜN","ORANGE"],
                         ["СИНИЙ","КРАСНЫЙ","ЖЁЛТЫЙ","ЧЕРНЫЙ","ФИОЛЕТОВЫЙ","ЗЕЛЁНЫЙ","ОРАНЖЕВЫЙ"],
                         ["蓝","红","黄","黑","紫","绿","橙"]];

    const ONE_SECOND = 1000;
    const SECONDS_IN_MINUTE = 60;

    let source_lang;
    let response_lang;

    let timer = null;
    let clickTime;
    let remainingTime = TIMER_START;
    let totalResponseTime = 0;

    // Correct means color of the letters was correctly chosen
    let numCorrect = 0;

    // AllWrong means choice didn't match the meaning or the color
    let numAllWrong = 0;

    // Mismatch means choice matched meaning instead of color
    let numMismatch = 0;

  /**
   * Add a function that will be called when the window is loaded.
   */
  window.addEventListener("load", init);

  /**
   * Add listeners to all of the buttons on the page.
   */
  function init() {

    id("start").addEventListener("click",start);
    let buttons = qsa(".response_btn");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click",processResponse);
    }

    fetch(BASE_URL_LANG_LIST+'?'+API_KEY+"&target=en")
      .then(statusCheck)
      .then(resp => resp.json())
      .then(processLangs)
      .catch(console.error)
    
  }

  function processLangs(response) {
    let lang_list = response.data.languages;
    let s_list_item;
    let r_list_item;

    for (let i = 0; i < lang_list.length; i++) {
      languages[i+1] = lang_list[i].name;
      lang_codes[i+1] = lang_list[i].language;
      s_list_item = gen('option');
      s_list_item.textContent=lang_list[i].name;
      s_list_item.value=lang_list[i].value;
      r_list_item = gen('option');
      r_list_item.textContent=lang_list[i].name;
      r_list_item.value=lang_list[i].value;
      if(lang_list[i].name=="English") {
        s_list_item.selected=true;
        r_list_item.selected=true;
      }
      id('source_lang').appendChild(s_list_item);
      id('response_lang').appendChild(r_list_item);
    }
  }
  /**
   * Event listener for the Start button.  Starts the timer, randomizes the
   * labels on the response buttons, and generates the first prompt.
   */
  function start() {
    // Run the tick function every second
    timer = setInterval(tick, ONE_SECOND);

    // Reset all the counters
    remainingTime = TIMER_START;
    totalResponseTime = 0;
    numCorrect = 0;
    numAllWrong = 0;
    numMismatch = 0;


    // Get the language values selected by the user for this run
    source_lang = id("source_lang").value;
    response_lang = id("response_lang").value;

    // Note the current time so we can calculate user's performance
    clickTime = Date.now();

    // Add a prompt to the board
    generateItem();

    // Randomize the labels on the response buttons
    randomizeButtons();

    // Remove the starting instructions from the game board
    id("help").classList.toggle("invisible");

    // Add the in-game help message
    id("instructions").classList.toggle("invisible");

    // Disable the Start button until the timer runs out
    id("start").disabled = true;

    // Reset the scoreboard
    updateScoreDisplay();
  }

  /**
   * Generates a new prompt on the board
   */
  function generateItem() {

    // Generate a new item
    let item = gen("p");

    // Select a random index to pull from the list of color words
    let word = Math.floor(Math.random() * COLOR_NAMES.length);

    // Initialize the font color to be the same as the selected color word
    let color = word;

    // Since we need the color word and font color to be different for
    // the effect to kick in, keep randomly selecting indexes until
    // they're different
    while (color===word) {
        color = Math.floor(Math.random() * COLOR_NAMES.length);
    }

    // Get the appropriate color word for the selected language
    // and set it as the new item's text
    item.textContent = COLOR_WORDS[source_lang][word];

    // Add a class to the new item that tells it which color to 
    // make the font
    item.classList.add(COLOR_NAMES[color]);

    // Store the both the meaning and the color of the word 
    item.id = word + "_" + color;

    // Get the current dimensions of the game board by gathering
    // the computed style
    const BOARD_STYLE = window.getComputedStyle(id("board"));

    // Generate a random position within the game board for the new item
    // Padding values were determined experimentally (hence the magic numbers)
    item.style.top = (60 + Math.floor(Math.random() * (BOARD_STYLE.height.replace('px','') - 55))) + 'px';
    item.style.left = (15 + Math.floor(Math.random() * (BOARD_STYLE.width.replace('px','') - 270))) + 'px';

    // Add the new item to the game board
    id("board").appendChild(item);
    
  }

  /**
   * Randomizes the order of the button labels on the response buttons so we
   * know the user hasn't just memorized the locations of the buttons rather
   * than reading them
   */
  function randomizeButtons() {
    // Get an array of the buttons
    let buttons = qsa(".response_btn");

    // Create a new array of all the possible labels in a random order
    let rndOrder = shuffle([...Array(buttons.length).keys()]);

    // Apply the color words from the appropriate response language as
    // labels on the buttons, and enable the buttons
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].textContent = COLOR_WORDS[response_lang][rndOrder[i]];

        // Use the id property of the item to store which color is being 
        // referenced
        buttons[i].id = rndOrder[i];
        buttons[i].disabled = false;
    }
  }

  /**
   * Event handler for when the response buttons are clicked.  Checks to 
   * see whether the user chose the correct color and records the time
   * since the item was added in ms.
   */
  function processResponse() {
    // Add the time since the item was added to the total response time counter
    totalResponseTime += Date.now() - clickTime;

    // Gets the current item from the game board
    let item = qs("#board p");

    // Break apart the color and the meaning
    let itemColors = item.id.split('_');

    // Compare the id of the item to the id of the clicked button and update
    // the appropriate score counter.
    if (this.id == itemColors[1]) {
        numCorrect++;
    } else if (this.id == itemColors[0]) {
        numMismatch++;
    } else {
        numAllWrong++;
    }

    // Remove the item from the gameboard
    item.remove();

    // And add a new item
    generateItem();

    // Note the current time for the next click
    clickTime = Date.now();

    // Update all of the scoring labels with the results from this round
    updateScoreDisplay();
  }

  /**
   * Runs every second.  Updates the timer display and ends the game is timer is out.
   */
  function tick() {

    // Update timer display
    updateTimeDisplay();

    // If time is out, stop the timer and display final results.
    if (remainingTime===0) {
        clearInterval(timer);
        timer = null;
        updateResults();
    }
  }

  /**
   * Updates all of the scoring labels below the gameboard
   */
  function updateScoreDisplay() {
    id("num_correct").textContent = numCorrect;
    id("num_mismatch").textContent = numMismatch;
    id("num_wrong").textContent = numAllWrong;
    id("response_time").textContent = (numCorrect + numAllWrong + numMismatch)==0 ? "0 ms" : Math.floor(totalResponseTime / (numCorrect + numAllWrong + numMismatch)) + ' ms';
  }

  /**
   * Updates the timer label below the gameboard
   */
  function updateTimeDisplay() {
    // Decrement the time remaining counter
    remainingTime--;

    // Calculate the number of seconds remaining in the current minute
    let secondsDisplay = remainingTime % SECONDS_IN_MINUTE;

    // Add a padding 0 if necessary
    secondsDisplay = (remainingTime < 10 ? "0" : "") + remainingTime;

    // Calculate the number of minutes remaining
    let minutesDisplay = Math.floor(remainingTime / SECONDS_IN_MINUTE);

    // Build the timer value from the calculated parts
    id("timer").textContent = minutesDisplay + ":" + secondsDisplay;
  }

  /**
   * Updates the scores at the end of the game.
   */
  function updateResults() {
    // Remove the last item from the gameboard
    qs("#board p").remove();

    // Disable all of the response buttons
    let buttons = qsa(".response_btn");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }

    // Put the starting instructions back up
    id("help").classList.toggle("invisible");

    // And remove the in-game instructions
    id("instructions").classList.toggle("invisible");

    // Reenable the start button so the user can play again if desired
    id("start").disabled = false;
  }

  /**
   * Randomizes the order of elements in an array.  From StackOverflow:
   * https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
   * @param {*} array the array to randomize
   * @returns the randomized array
   */
  function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }

  /** ------------------------------ Helper Functions  ------------------------------ */

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} selector - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns a new element with the given tag name.
   * @param {string} tagName - HTML tag name for new DOM element.
   * @returns {object} New DOM object for given HTML tag.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }

 /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} res - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }
})();