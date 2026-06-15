async function analyzeWithAI(text) {
    const url = 'https://wtyczka-ebon.vercel.app/api/analyze';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const rawText = await response.text();

        let data;
        try {
            data = JSON.parse(rawText);
        } catch {
            throw new Error("Serwer nie zwrócił JSON-a: " + rawText.slice(0, 500));
        }
        if (data.ok === true && typeof data.text === "string") {
            return data.text;
        }
        if (!response.ok) {
            throw new Error(
                data.error ||
                data.details ||
                "HTTP " + response.status + ": " + JSON.stringify(data).slice(0, 500)
            );
        }
        throw new Error(
            "Backend zwrócił zły format: " + JSON.stringify(data).slice(0, 500)
        );

    } catch (error) {
        console.error("Szczegóły błędu:", error);
        return "Błąd: " + error.message;
    }
}

//LOGIKA WIZUALNEGO WSKAŹNIKA
const needle = document.getElementById("needle");
const scoreText = document.getElementById("scoreText");
const labelText = document.getElementById("labelText");
const gaugeSegments = document.getElementById("gaugeSegments");

let currentPercent = 0;
let animationId = null;

const segments = [
  { from: 0, to: 25, color: "#22c55e" },
  { from: 25, to: 50, color: "#eab308" },  
  { from: 50, to: 75, color: "#f97316" },  
  { from: 75, to: 100, color: "#ef4444" }  
];

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function pointForPercent(percent) {
  const angle = Math.PI - (percent / 100) * Math.PI;
  return { x: 100 + 75 * Math.cos(angle), y: 100 - 75 * Math.sin(angle) };
}

function createArcPath(fromPercent, toPercent) {
  const start = pointForPercent(fromPercent);
  const end = pointForPercent(toPercent);
  return `M ${start.x} ${start.y} A 75 75 0 0 1 ${end.x} ${end.y}`;
}

function drawGaugeSegments() {
  segments.forEach(segment => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", createArcPath(segment.from + 1, segment.to - 1));
    path.setAttribute("stroke", segment.color);
    path.setAttribute("class", "segment");
    gaugeSegments.appendChild(path);
  });
}

function getClickbaitLabel(percent) {
  if (percent < 25) return "Niski poziom manipulacji";
  if (percent < 50) return "Umiarkowany clickbait";
  if (percent < 75) return "Wysoki clickbait";
  return "Krytyczna manipulacja";
}

function getClickbaitColor(percent) {
  if (percent < 25) return "#22c55e";
  if (percent < 50) return "#eab308";
  if (percent < 75) return "#f97316";
  return "#ef4444";
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function setGaugeValue(targetPercent) {
  targetPercent = clamp(targetPercent, 0, 100);
  if (animationId) cancelAnimationFrame(animationId);

  const startPercent = currentPercent;
  const difference = targetPercent - startPercent;
  const duration = 900;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = clamp(elapsed / duration, 0, 1);
    const eased = easeOutCubic(progress);
    const animatedPercent = startPercent + difference * eased;
    const rotation = animatedPercent * 1.8 - 90;

    needle.setAttribute("transform", `rotate(${rotation} 100 100)`);
    scoreText.textContent = `${Math.round(animatedPercent)}%`;

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      currentPercent = targetPercent;
      scoreText.style.color = getClickbaitColor(targetPercent);
      labelText.textContent = getClickbaitLabel(targetPercent);
    }
  }
  animationId = requestAnimationFrame(animate);
}

drawGaugeSegments();

function updateGauge(aiResponseText) {
    const match = aiResponseText.match(/Poziom manipulacji:\s*(\d{1,3})%/i);
    let manipulationLevel = match ? parseInt(match[1], 10) : 0;

    manipulationLevel = clamp(manipulationLevel, 0, 100);
    setGaugeValue(manipulationLevel);
}

//OBSŁUGA PRZYCISKÓW
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultText = document.getElementById('result');
    
    analyzeBtn.disabled = true;
    analyzeBtn.innerText = "Skanowanie...";
    resultText.innerText = "Ładowanie danych...";
    scoreText.textContent = "⌛";
    labelText.textContent = "Analizuję tekst...";
    scoreText.style.color = "#2d3436";

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tab.url.split('?')[0]; 

        chrome.storage.local.get([currentUrl], async (dbResult) => {
            const cachedData = dbResult[currentUrl];
            
            if (cachedData && !cachedData.includes("Błąd")) {
                updateGauge(cachedData);
                resultText.innerHTML = "Ta strona została przeanalizowna wcześniej. Odczyt z bazy: \n <br><br>" + formatAIResponse(cachedData);
                analyzeBtn.disabled = false;
                analyzeBtn.innerText = "Analizuj tę stronę";
                return; 
            }

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                function cleanText(text) {
                    return text
                        .replace(/\u00a0/g, " ")
                        .replace(/[ \t]+/g, " ")
                        .replace(/\n{3,}/g, "\n\n")
                        .trim();
                }

                function isBadLine(line) {
                    const lower = line.toLowerCase().trim();

                    if (lower.length < 35) return true;

                    const badPhrases = [
                        "reklama",
                        "tylko u nas",
                        "czytaj także",
                        "czytaj też",
                        "zobacz także",
                        "zobacz również",
                        "polecamy",
                        "najpopularniejsze",
                        "więcej na ten temat",
                        "udostępnij",
                        "skomentuj",
                        "newsletter",
                        "obserwuj nas",
                        "kliknij tutaj",
                        "zaakceptuj",
                        "polityka prywatności",
                        "zgody",
                        "cookies",
                        "materiał promocyjny",
                        "artykuł sponsorowany"
                    ];

                    return badPhrases.some(phrase => lower.includes(phrase));
                }

                function removeGarbageElements(root) {
                    const garbageSelectors = [
                        "script",
                        "style",
                        "noscript",
                        "iframe",
                        "svg",
                        "canvas",
                        "nav",
                        "header",
                        "footer",
                        "aside",
                        "form",
                        "button",
                        "[role='navigation']",
                        "[role='banner']",
                        "[role='complementary']",
                        ".ad",
                        ".ads",
                        ".advertisement",
                        ".banner",
                        ".cookie",
                        ".cookies",
                        ".newsletter",
                        ".related",
                        ".recommended",
                        ".popular",
                        ".share",
                        ".social",
                        ".comments",
                        ".comment",
                        ".sidebar",
                        ".teaser",
                        ".promo"
                    ];

                    garbageSelectors.forEach(selector => {
                        root.querySelectorAll(selector).forEach(el => el.remove());
                    });
                }

                function getJsonLdArticleBody() {
                    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

                    for (const script of scripts) {
                        try {
                            const data = JSON.parse(script.textContent);

                            const items = Array.isArray(data)
                                ? data
                                : data["@graph"]
                                    ? data["@graph"]
                                    : [data];

                            for (const item of items) {
                                const type = item["@type"];

                                const isArticle =
                                    type === "Article" ||
                                    type === "NewsArticle" ||
                                    type === "BlogPosting" ||
                                    (Array.isArray(type) && type.some(t => ["Article", "NewsArticle", "BlogPosting"].includes(t)));

                                if (isArticle && item.articleBody && item.articleBody.length > 300) {
                                    return cleanText(item.articleBody);
                                }
                            }
                        } catch {
                            
                        }
                    }

                    return "";
                }

                function scoreElement(el) {
                    const text = cleanText(el.innerText || "");
                    const paragraphs = el.querySelectorAll("p").length;
                    const linksTextLength = Array.from(el.querySelectorAll("a"))
                        .map(a => a.innerText || "")
                        .join(" ")
                        .length;

                    const textLength = text.length;
                    const linkRatio = textLength > 0 ? linksTextLength / textLength : 1;

                    let score = textLength + paragraphs * 250;

                    if (linkRatio > 0.25) score -= textLength * 0.5;
                    if (paragraphs < 3) score -= 1000;

                    return score;
                }

                const selectedText = window.getSelection().toString();
                if (selectedText.trim().length > 100) {
                    return cleanText(selectedText).substring(0, 25000);
                }

                const jsonLdText = getJsonLdArticleBody();
                if (jsonLdText.length > 500) {
                    return jsonLdText.substring(0, 25000);
                }

                const candidates = Array.from(document.querySelectorAll(`
                    article,
                    main,
                    [role="main"],
                    .article,
                    .article-body,
                    .article-content,
                    .post-content,
                    .entry-content,
                    .news-content,
                    .content
                `));

                let bestElement = null;

                if (candidates.length > 0) {
                    bestElement = candidates
                        .map(el => ({ el, score: scoreElement(el) }))
                        .sort((a, b) => b.score - a.score)[0].el;
                } else {
                    bestElement = document.body;
                }

                const clone = bestElement.cloneNode(true);
                removeGarbageElements(clone);

                const title = document.querySelector("h1")?.innerText || "";

                const paragraphs = Array.from(clone.querySelectorAll("p"))
                    .map(p => cleanText(p.innerText || ""))
                    .filter(line => !isBadLine(line));

                let articleText = "";

                if (paragraphs.length >= 3) {
                    articleText = paragraphs.join("\n\n");
                } else {
                    articleText = cleanText(clone.innerText || document.body.innerText);
                    articleText = articleText
                        .split("\n")
                        .map(line => cleanText(line))
                        .filter(line => !isBadLine(line))
                        .join("\n\n");
                }

                const finalText = cleanText(`${title}\n\n${articleText}`);

                return finalText.substring(0, 25000);
            },
            }, async (injectionResults) => {
                const textFromPage = injectionResults[0].result;
                const aiResponse = await analyzeWithAI(textFromPage);
                
                if (!aiResponse.includes("Błąd")) {
                    let dataToSave = {};
                    dataToSave[currentUrl] = aiResponse;
                    chrome.storage.local.set(dataToSave);
                    updateGauge(aiResponse);
                }

                resultText.innerHTML = formatAIResponse(aiResponse);
                analyzeBtn.disabled = false;
                analyzeBtn.innerText = "Analizuj tę stronę";
            });
        });

    } catch (error) {
        resultText.innerText = "Błąd wtyczki: Brak dostępu.";
        analyzeBtn.disabled = false;
        analyzeBtn.innerText = "Analizuj tę stronę";
    }
});

document.getElementById('clearBtn').addEventListener('click', async () => {
    const resultText = document.getElementById('result');

    resultText.innerText = "Czyszczenie pamięci...";

    try {
        await new Promise((resolve, reject) => {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });

        await new Promise((resolve) => {
            if (!chrome.storage.sync) return resolve();

            chrome.storage.sync.clear(() => {
                resolve();
            });
        });

        await new Promise((resolve) => {
            if (!chrome.storage.session) return resolve();

            chrome.storage.session.clear(() => {
                resolve();
            });
        });

        const remainingLocal = await new Promise((resolve) => {
            chrome.storage.local.get(null, (items) => {
                resolve(items || {});
            });
        });

        console.log("PO CZYSZCZENIU chrome.storage.local:", remainingLocal);

        setGaugeValue(0);
        currentPercent = 0;

        scoreText.textContent = "0%";
        scoreText.style.color = "#2d3436";
        labelText.textContent = "Gotowy do analizy";

        resultText.innerText =
            "Pamięć wtyczki została wyczyszczona w 100%.\n\nPozostałe klucze local: " +
            Object.keys(remainingLocal).length;

    } catch (error) {
        console.error("Błąd czyszczenia pamięci:", error);
        resultText.innerText = "Błąd czyszczenia pamięci: " + error.message;
    }
});

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatAIResponse(text) {
    let cleanedText = text.replace(/Poziom manipulacji:\s*\d{1,3}%/i, '');
    cleanedText = cleanedText.trim();

    cleanedText = escapeHtml(cleanedText);

    return cleanedText
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/\n/g, '<br>');
}