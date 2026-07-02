document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pollId = urlParams.get('id');

    if (!pollId) {
        document.getElementById('pollTitle').innerText = "No Poll Specified";
        return;
    }

    let pollData = null;

    try {
        const res = await fetch(`/api/polls/${pollId}`);
        if (!res.ok) throw new Error("Poll not found");
        pollData = await res.json();
    } catch (e) {
        document.getElementById('pollTitle').innerText = "Poll not found or inactive.";
        return;
    }

    document.getElementById('pollTitle').innerText = pollData.title;
    document.getElementById('pollDesc').innerText = pollData.description;

    const form = document.getElementById('pollForm');
    form.style.display = 'block';

    pollData.questions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'question-block';
        let inputHtml = '';

        if (q.type === 'text') {
            inputHtml = `<input type="text" name="${q.id}" class="form-input" required>`;
        } else if (q.type === 'number') {
            inputHtml = `<input type="number" name="${q.id}" class="form-input" required>`;
        } else if (q.type === 'radio') {
            q.options.forEach(opt => {
                inputHtml += `<label class="option-label"><input type="radio" name="${q.id}" value="${opt}" required> ${opt}</label>`;
            });
        } else if (q.type === 'checkbox') {
            q.options.forEach(opt => {
                inputHtml += `<label class="option-label"><input type="checkbox" name="${q.id}" value="${opt}"> ${opt}</label>`;
            });
        }

        div.innerHTML = `<h3>${index + 1}. ${q.text}</h3>${inputHtml}`;
        form.appendChild(div);
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'button';
    submitBtn.innerText = 'Submit Response';
    form.appendChild(submitBtn);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const responses = [];

        pollData.questions.forEach(q => {
            if (q.type === 'checkbox') {
                responses.push({ questionId: q.id, value: formData.getAll(q.id) });
            } else {
                responses.push({ questionId: q.id, value: formData.get(q.id) });
            }
        });

        try {
            const res = await fetch(`/api/polls/${pollId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ responses })
            });

            if (res.ok) {
                form.style.display = 'none';
                document.getElementById('pollMessage').innerText = "Thank you! Your response has been recorded.";
                document.getElementById('pollMessage').style.color = '#1DB954';
            } else {
                throw new Error("Failed to submit");
            }
        } catch (error) {
            document.getElementById('pollMessage').innerText = "An error occurred submitting your response.";
            document.getElementById('pollMessage').style.color = '#e53935';
        }
    });
});