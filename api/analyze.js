export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const VERSION = "clickbaitometr-backend-v3";

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      version: VERSION,
      message: "Endpoint analyze działa poprawnie."
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      version: VERSION,
      error: "Dozwolona jest tylko metoda POST."
    });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({
      ok: false,
      version: VERSION,
      error: "Brak GROQ_API_KEY na Vercelu."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const text = body?.text;

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return res.status(400).json({
        ok: false,
        version: VERSION,
        error: "Za mało tekstu do analizy."
      });
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
Jesteś narzędziem do analizy clickbaitu i manipulacji w artykułach internetowych.

Zwróć WYŁĄCZNIE poprawny JSON. Bez markdowna, bez komentarza i bez własnych opinii.

Format:
{
"score": 0,
"analysis": [
"argument 1",
"argument 2"
],
"summary": [
"fakt 1",
"fakt 2",
"fakt 3"
]
}

Zasady podstawowe:

* score to liczba od 0 do 100.
* analysis ma mieć dokładnie 2 argumenty.
* summary ma mieć 2 albo 3 konkretne fakty z głównej treści artykułu.
* Nie dodawaj własnych opinii politycznych, moralnych ani prawnych.
* Nie proponuj referendum, kar, zmian prawa ani działań władz, jeśli nie wynika to bezpośrednio z tekstu.
* Nie oceniaj tematu artykułu, tylko sposób jego napisania.
* Poważny, kontrowersyjny, kryminalny, tragiczny albo emocjonalnie trudny temat NIE oznacza automatycznie manipulacji.
* Wysoki score przyznawaj tylko wtedy, gdy tekst używa wyraźnych technik manipulacyjnych, a nie tylko opisuje poważne wydarzenia.

Najpierw zidentyfikuj główną treść artykułu:

* Skup się na właściwym artykule, jego tytule, leadzie i akapitach głównej treści.
* Ignoruj reklamy, menu, stopki, linki do innych artykułów, sekcje „zobacz także”, newslettery, komentarze, komunikaty cookies i elementy nawigacji.
* Jeśli w tekście są wstawki reklamowe lub tytuły innych artykułów, nie traktuj ich jako części analizowanego artykułu.
* Jeśli nie da się znaleźć właściwej treści artykułu, ustaw score na 0 i summary na ["Nie udało się pobrać pełnej treści."].

Kalibracja score:

* 0-10: tekst neutralny, rzeczowy, krótki lub techniczny; brak widocznych technik manipulacji.
* 11-25: standardowy artykuł informacyjny; może zawierać mocny temat, ale opisuje fakty bez wyraźnego podkręcania emocji.
* 26-40: lekko clickbaitowy lub lekko emocjonalny styl; pojedyncze sugestywne określenia, ale nadal dominują fakty.
* 41-55: wyraźnie podkręcony tekst; emocjonalny tytuł, sensacyjny lead, jednostronny dobór sformułowań albo presja na reakcję czytelnika.
* 56-70: mocna manipulacja; wiele nacechowanych słów, straszenie, sugestie bez dowodów, wyolbrzymienia, mocno jednostronna narracja.
* 71-85: bardzo silna manipulacja; tekst wyraźnie prowadzi czytelnika do jednej emocjonalnej reakcji, używa alarmistycznego tonu i ogranicza kontekst.
* 86-100: skrajna manipulacja; propaganda, fałszywe lub nieuzasadnione twierdzenia, silne straszenie, nagonka, dehumanizacja albo jawne wprowadzanie w błąd.

Zasady obniżania wyniku:

* Jeśli tekst podaje konkretne fakty, osoby, daty, zarzuty, decyzje sądu, stanowisko prokuratury lub wypowiedzi stron, nie zawyżaj wyniku tylko dlatego, że temat jest poważny.
* Jeśli emocjonalność wynika głównie z samego wydarzenia, a nie ze stylu autora, score powinien zwykle mieścić się w zakresie 10-35.
* Jeśli tekst jest typową depeszą/newsową relacją z wydarzenia, zwykle przyznaj 10-30.
* Jeśli tekst zawiera kontrowersyjny temat, ale nie używa wyraźnych chwytów clickbaitowych, nie przekraczaj 40.
* Nie dawaj wyniku powyżej 60, jeśli nie ma co najmniej dwóch wyraźnych technik manipulacji.
* Nie dawaj wyniku powyżej 75, jeśli tekst nie zawiera silnego straszenia, skrajnej jednostronności, wyolbrzymień albo sugestii bez pokrycia.
* Samo użycie słów takich jak „zarzuty”, „zatrzymano”, „śledztwo”, „zwłoki”, „aborcja”, „więzienie”, „tragedia”, „śmierć” nie jest manipulacją, jeśli wynika z faktów sprawy.

Co oceniasz jako manipulację:

* clickbaitowy tytuł obiecujący więcej, niż daje tekst,
* emocjonalne lub alarmistyczne słownictwo,
* wyolbrzymianie znaczenia wydarzenia,
* sugestie bez dowodów,
* jednostronne przedstawienie sprawy,
* pomijanie ważnego kontekstu,
* presję na oburzenie, strach lub natychmiastową reakcję,
* mieszanie faktów z opiniami autora,
* insynuacje przedstawiane tak, jakby były faktami.

Co NIE jest manipulacją samo w sobie:

* opis przestępstwa, śledztwa, zarzutów lub procesu,
* cytowanie prokuratury, policji, sądu albo świadków,
* podanie możliwej kary wynikającej z przepisów,
* opis kontrowersyjnego tematu,
* neutralne streszczenie wydarzeń,
* mocny temat bez mocnego, sensacyjnego języka.

W analysis:

* Pierwszy argument ma uzasadniać, dlaczego wynik nie jest wyższy albo dlaczego jest podwyższony.
* Drugi argument ma wskazać konkretny element stylu tekstu: emocjonalność, clickbait, jednostronność, wyolbrzymienie albo ich brak.
* Używaj spokojnego, technicznego języka.
* Nie oceniaj, kto ma rację w sporze opisanym w artykule.

W summary:

* Wypisz tylko fakty z głównej treści artykułu.
* Nie dopisuj własnych wniosków.
* Nie streszczaj reklam, menu, innych artykułów ani komunikatów strony.
            `.trim()
          },
          {
            role: "user",
            content: `TEKST DO ANALIZY:\n\n${text.slice(0, 25000)}`
          }
        ]
      })
    });

    const raw = await groqResponse.text();

    if (!groqResponse.ok) {
      return res.status(groqResponse.status).json({
        ok: false,
        version: VERSION,
        error: "Groq API zwróciło błąd.",
        details: raw
      });
    }

    let groqData;

    try {
      groqData = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        ok: false,
        version: VERSION,
        error: "Groq zwrócił niepoprawny JSON.",
        details: raw
      });
    }

    const content = groqData?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({
        ok: false,
        version: VERSION,
        error: "Brak treści odpowiedzi AI.",
        details: groqData
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(500).json({
        ok: false,
        version: VERSION,
        error: "AI zwróciło tekst zamiast JSON-a.",
        details: content
      });
    }

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));

    const analysis = Array.isArray(parsed.analysis) && parsed.analysis.length > 0
      ? parsed.analysis.slice(0, 2)
      : [
          "Nie udało się poprawnie przeanalizować tekstu.",
          "Spróbuj ponownie na stronie z pełną treścią artykułu."
        ];

    const summary = Array.isArray(parsed.summary) && parsed.summary.length > 0
      ? parsed.summary.slice(0, 3)
      : ["Nie udało się pobrać pełnej treści."];

    const formattedText = [
      `Poziom manipulacji: ${score}%`,
      "",
      "**Analiza:**",
      ...analysis.map(item => `- ${item}`),
      "",
      "**Skrót artykułu:**",
      ...summary.map(item => `- ${item}`)
    ].join("\n");

    return res.status(200).json({
      ok: true,
      version: VERSION,
      score,
      text: formattedText
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      version: VERSION,
      error: "Błąd serwera podczas analizy AI.",
      details: String(error?.message || error)
    });
  }
}