import { GoogleGenerativeAI } from "@google/generative-ai";

const KEY = "QUl6YVN5Qm9OcEFQZXRQZzFXeF" + "JieURlYTdtMXNYVGVTSUVGbHJr";
const genAI = new GoogleGenerativeAI(atob(KEY));
const model = genAI.getGenerativeModel({ model: "gemini-pro"});

let prompt = "The following text was typed quickly on a mobile phone. Proofread it for typos and grammatical errors. Return only the corrected text and nothing else. ";
prompt += "TEXT: "

let lastProofreadLocation = 0; // Track until where the text has been proofread

window.timeout = null;

function resetText() {
	const editable = document.getElementById('inputfield');
	editable.innerHTML = "";
	lastProofreadLocation = 0;
  clearTimeout(window.timeout);
  document.getElementById('spinner').style.display = 'none';
	placeCursorAtEnd(editable);
}

window.resetText = resetText;

async function proofread() {
	const editable = document.getElementById('inputfield');
	const textToProofread = editable.innerText;
	const trailingSpace = editable.innerText[editable.innerText.length - 1] === " ";

	if (lastProofreadLocation > (textToProofread.length - 5)) return; // Ensure at least 5 chars typed

	console.log(prompt + textToProofread);
	// Show spinner
	document.getElementById('spinner').style.display = 'inline';

	const result = await model.generateContent(prompt + textToProofread);
	const response = await result.response;
	let proofreadResponse = response.text();

	// Hide spinner
	document.getElementById('spinner').style.display = 'none';

	console.log(proofreadResponse);
	editable.innerHTML = highlightChanges(textToProofread, proofreadResponse).trim() + (trailingSpace?" ":"");

	Array.from(document.getElementsByClassName("highlight")).forEach(highlight =>  {
	  highlight.addEventListener('click', (event) => {
	    if (event.clientY < event.target.offsetTop) {
	      const previousText = event.target.getAttribute("data-previous");
	      const correctedText = event.target.innerText;
	      event.target.innerText = previousText;
	      event.target.removeAttribute("data-previous");
	    }
	  })
	});

	lastProofreadLocation = editable.innerText.length;

	placeCursorAtEnd(editable);
}

window.proofread = proofread;


function placeCursorAtEnd(el) { // Takes in element
    el.focus(); // Focus on the element to make sure it's ready for the cursor

    // Create a range object and set the cursor position to the end of the element
    var range = document.createRange();
    var sel = window.getSelection();

    // Check if there are child nodes to place the cursor after the last child
    if (el.lastChild) {
        // Create a range after the last child
        range.setStartAfter(el.lastChild);
    } else {
        // If no children, just set the range to the start of the element
        range.setStart(el, 0);
    }

    range.collapse(true); // Collapse the range to the end point, making it a cursor position rather than a selection

    // Remove any selections and add the new range
    sel.removeAllRanges();
    sel.addRange(range);
}

window.placeCursorAtEnd = placeCursorAtEnd;

function insertCharAt(str, char, pos) {
    if (pos > str.length) {
        console.log("Position is beyond the length of the string.");
        return str;
    }
    return str.slice(0, pos) + char + str.slice(pos);
}

function highlightChanges(a, b) {
    // Split the strings into arrays of words and spaces.
    const wordsA = a.match(/\S+|\s+/g) || [];
    const wordsB = b.match(/\S+|\s+/g) || [];

    // Use the diff library to find the differences between the two arrays of words.
    const differences = Diff.diffArrays(wordsA, wordsB);

    let result = '';
    let indexA = 0; // Track position in the original text.

    let previousWord = '';
    // Iterate through each part of the diff result.
    differences.forEach(part => {
        if (part.added) {
            // If part is added, wrap it in a <span> with a data-previous attribute if applicable.
            // If previous word is empty and there's a previous span, append to it
            if (previousWord === "" && result.endsWith("</span> ")) {
                result = result.slice(0, -8) + " " +part.value.join('').trim() + "</span> ";
            } else if (previousWord === "" && result.endsWith("</span>")) {
                result = result.slice(0, -7) + " " +part.value.join('').trim() + "</span> ";
            } else {
                result += ` <span class="highlight" contenteditable="false" data-previous='${previousWord}'>${part.value.join('').trim()}</span>`;
            }
            previousWord = "";
        } else if (part.removed) {
            // If the part is removed, increase the indexA position but don't add to result.
            indexA += part.count;
            previousWord = part.value.join('');
        } else {
            // If the part is unchanged, add it as is and update the indexA position.
            result += " " + part.value.join('');
            indexA += part.count;
        }
    });

    return result.replace('  ', ' ');
}

function isPunctuated() {
	const str = document.getElementById('inputfield').innerText.trim();
	const punctuation = '.?!';
	return (str.length > 0) && (punctuation.indexOf(str[str.length - 1]) > -1);
}

window.isPunctuated = isPunctuated;
window.highlightChanges = highlightChanges;

document.addEventListener("DOMContentLoaded", function() {
    const editable = document.getElementById('inputfield');
    
    editable.addEventListener('input', function() {
        // Clear the timeout if it has already been set.
        // This will prevent the previous task from executing
        // if a new event is triggered before the 1s has finished.
        clearTimeout(window.timeout);
        const len = editable.innerText.length;
        // If text was deleted, don't proofread
        if (len < lastProofreadLocation) {
        	console.log("del");
        	lastProofreadLocation = len;
        } else if (isPunctuated()) { // If punctuated, proofread immediately
        	console.log("punctuation detected");
        	proofread();
        } else { // Otherwise set a new timeout to run 1 second (1000 ms) from this last event
        	window.timeout = setTimeout(function() {
            // Check if the content is non-empty
            if (editable.innerText.trim() !== '') proofread();
        	}, 1000);
        }
    });

    placeCursorAtEnd(editable);
});
