// 🔍 Confirm GPT API is working
/*
fetch('/ping')
  .then(res => res.json())
  .then(data => {
    alert("GPT says: " + data.result); // You can also use console.log
  })
  .catch(err => {
    alert("Ping failed. GPT may not be connected.");
    console.error(err);
  });
*/


document.addEventListener("DOMContentLoaded", () => {
  let questions = [];
  let questionCount = 10;

  const countSelect = document.getElementById("count-select");
  const countBtns = document.querySelectorAll(".count-btn");
  const questionBox = document.getElementById("question-box");

  countBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      questionCount = parseInt(btn.getAttribute("data-count"));
      countSelect.style.display = "none";
      questionBox.style.display = "block";
      loadQuestions();
    });
  });

async function loadQuestions() {
  const res = await fetch(`/api/questions?count=${questionCount}`);
  const data = await res.json();
  questions = data.questions;
  loadQuestion();
}


  let currentIndex = 0;
  const userAnswers = [];

  const questionElement = document.getElementById("question");
  const answerElement = document.getElementById("answer");
  const nextBtn = document.getElementById("next-btn");
  const exportBtn = document.getElementById("export-btn");
  const copyBox = document.getElementById("copy-box");

  // Automatically resize the textarea based on input
    answerElement.addEventListener('input', () => {
    answerElement.style.height = 'auto';
    answerElement.style.height = answerElement.scrollHeight + 'px';
});


  function loadQuestion() {
    if (currentIndex < questions.length) {
      questionElement.textContent = questions[currentIndex];
      answerElement.value = "";
    } else {
      showExport();
    }
  }

  nextBtn.addEventListener("click", () => {
    const answer = answerElement.value.trim();
    if (!answer) {
      alert("Please answer the question before continuing.");
      return;
    }

    userAnswers.push({
      question: questions[currentIndex],
      answer: answer
    });

    currentIndex++;
    loadQuestion();
  });

    function showExport() {
        questionElement.textContent = "All done! Here's your session:";
        answerElement.style.display = "none";
        nextBtn.style.display = "none";
        // exportBtn.style.display = "inline-block"; // Removed Copy All Answers button

        // Q&A Recap (now in details, collapsed by default, shown at the bottom)
        const recapDetails = document.getElementById('recap-details');
        recapDetails.style.display = "block";
        recapDetails.open = false;
        const recapBox = document.getElementById('recap-box');
        recapBox.textContent = userAnswers.map((qna, i) =>
            `Q${i + 1}: ${qna.question}\nA${i + 1}: ${qna.answer}\n`
        ).join("\n");
        recapBox.style.background = 'var(--ctp-mantle)';
        recapBox.style.border = '1.5px solid var(--ctp-overlay)';
        recapBox.style.borderRadius = '10px';
        recapBox.style.padding = '1.2em';
        recapBox.style.marginTop = '1em';
        recapBox.style.whiteSpace = 'pre-wrap';
        recapBox.style.fontSize = '1.08em';
        recapBox.style.lineHeight = '1.6em';
        recapBox.style.fontFamily = '"Segoe UI", sans-serif';

        // Summary/Similar Figures
        const summaryBox = document.getElementById('summary-box');
        summaryBox.style.display = "block";
        summaryBox.innerHTML = '';
        summaryBox.style.background = 'var(--ctp-mantle)';
        summaryBox.style.border = '1.5px solid var(--ctp-overlay)';
        summaryBox.style.borderRadius = '10px';
        summaryBox.style.padding = '1.2em';
        summaryBox.style.marginTop = '1.5em';
        summaryBox.style.fontSize = '1.08em';
        summaryBox.style.lineHeight = '1.6em';
        summaryBox.style.fontFamily = '"Segoe UI", sans-serif';
        summaryBox.style.textAlign = 'left'; // Set text alignment to left

        copyBox.style.display = "none";

        // Show loading spinner in summaryBox
        let spinner = document.createElement('div');
        spinner.id = 'ai-loading-spinner';
        spinner.innerHTML = '<span class="spinner"></span> Analyzing your answers...';
        spinner.style = 'margin-top:1.5em; color:var(--ctp-accent); font-size:1.1em; text-align:center;';
        summaryBox.appendChild(spinner);

    fetch('/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userAnswers })
})
.then(res => res.json())
.then(data => {
  // Remove spinner
  const sp = document.getElementById('ai-loading-spinner');
  if (sp) sp.remove();
  if (data.result) {
    let parsed;
    try {
      parsed = JSON.parse(data.result);
    } catch (e) {
      console.error("Could not parse GPT response as JSON:", data.result);
      summaryBox.innerHTML += `<br><br><strong>Summary:</strong> ${data.result}`;
      return;
    }

    const { summary, figures, coordinates } = parsed;

    summaryBox.innerHTML = `
      <strong>Summary:</strong> ${summary}
      <br><br><strong>Similar Public Figures:</strong>
      <ul style="margin-top:0.2em;">${figures.map(name => `<li>${name}</li>`).join('')}</ul>
    `;

    // Show and draw the political chart if coordinates are present
    if (coordinates && typeof coordinates.x === 'number' && typeof coordinates.y === 'number') {
      document.getElementById('political-chart-container').style.display = 'block';
      drawPoliticalChart(coordinates.x, coordinates.y);
    }
  } else {
    summaryBox.innerHTML += "<br><br><strong>⚠️ Could not get result.</strong>";
  }
})
.catch(err => {
  const sp = document.getElementById('ai-loading-spinner');
  if (sp) sp.remove();
  summaryBox.innerHTML += "<br><br><strong>⚠️ Error connecting to AI.</strong>";
  console.error(err);
});

        // Show Go Again button
        const goAgainBtn = document.getElementById('go-again-btn');
        goAgainBtn.style.display = 'block';
        goAgainBtn.onclick = () => {
          // Reset all UI to initial state
          recapDetails.style.display = 'none';
          summaryBox.style.display = 'none';
          document.getElementById('political-chart-container').style.display = 'none';
          goAgainBtn.style.display = 'none';
          countSelect.style.display = 'block';
          questionBox.style.display = 'none';
          currentIndex = 0;
          userAnswers.length = 0;
        };
    }

    exportBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(copyBox.textContent)
            .then(() => alert("Copied to clipboard!"))
            .catch(() => alert("Could not copy text"));
    });
  // 🚀 Initial call to display the first question
  loadQuestions();
});

// Draw the political compass chart and user's point
function drawPoliticalChart(x, y) {
  const canvas = document.getElementById('political-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid (10x10 squares = 9 lines)
  ctx.strokeStyle = '#45475a';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo((canvas.width / 10) * i, 0);
    ctx.lineTo((canvas.width / 10) * i, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (canvas.height / 10) * i);
    ctx.lineTo(canvas.width, (canvas.height / 10) * i);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = '#89b4fa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  // Draw axis labels (no rotation)
  ctx.font = 'bold 1.1em Segoe UI, sans-serif';
  ctx.fillStyle = '#a6adc8';
  ctx.textAlign = 'center';
  ctx.fillText('Left', 30, canvas.height / 2 - 10);
  ctx.fillText('Right', canvas.width - 30, canvas.height / 2 - 10);
  ctx.textAlign = 'left';
  ctx.fillText('Authoritarian', canvas.width / 2 + 10, 25);
  ctx.textAlign = 'right';
  ctx.fillText('Libertarian', canvas.width / 2 - 10, canvas.height - 10);

  // Draw user point (smaller)
  // x: -1 (left) to 1 (right), y: -1 (authoritarian) to 1 (libertarian)
  const px = ((x + 1) / 2) * canvas.width;
  const py = ((1 - y) / 2) * canvas.height;
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, 2 * Math.PI); // smaller dot
  ctx.fillStyle = '#f9e2af';
  ctx.strokeStyle = '#f38ba8';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}
