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

async function loadQuestions() {
  const res = await fetch('/api/questions?count=10'); // change 10 to user input later
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
        exportBtn.style.display = "inline-block";

        const exportText = userAnswers.map((qna, i) =>
            `Q${i + 1}: ${qna.question}\nA${i + 1}: ${qna.answer}\n`
        ).join("\n");

        copyBox.textContent = exportText;
        copyBox.style.display = "block";

    fetch('/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userAnswers })
})
.then(res => res.json())
.then(data => {
  if (data.result) {
    let parsed;
    try {
      parsed = JSON.parse(data.result);
    } catch (e) {
      console.error("Could not parse GPT response as JSON:", data.result);
      copyBox.innerHTML += `<br><br><strong>Summary:</strong> ${data.result}`;
      return;
    }

    const { summary, figures } = parsed;

    copyBox.innerHTML += `
      <br><br><strong>Summary:</strong> ${summary}
      <br><br><strong>Similar Public Figures:</strong>
      <ul>${figures.map(name => `<li>${name}</li>`).join('')}</ul>
    `;
  } else {
    copyBox.innerHTML += "<br><br><strong>⚠️ Could not get result.</strong>";
  }
})
.catch(err => {
  copyBox.innerHTML += "<br><br><strong>⚠️ Error connecting to AI.</strong>";
  console.error(err);
});

  }

    exportBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(copyBox.textContent)
            .then(() => alert("Copied to clipboard!"))
            .catch(() => alert("Could not copy text"));
    });
  // 🚀 Initial call to display the first question
  loadQuestions();
});
