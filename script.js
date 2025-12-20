// 全角 → 半角（数字・英字・記号すべて）
function toHalfWidth(str) {
    return str.replace(/[！-～]/g, s =>
        String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );
}


function calcSumNumber(text) {        
    const lines = text.trim().split('\n');
    const totals = {};

    lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed === '') return;

    // ✅ 名前＋打撃成績（3-2-2）を正規表現で抽出
    // const mainMatch = trimmed.match(/^(.+?)(\d+-\d+-\d+)(.*)$/);
    // if (!mainMatch) return;

    // const name = mainMatch[1].trim();
    // const valueStr = mainMatch[2];
    // const extrasRaw = mainMatch[3].trim(); // 補足項目（スペースなしでもOK）

    // 全角 → 半角に統一
    const lineHalf = toHalfWidth(trimmed);

    // ① 3-2-1 形式
    let mainMatch = lineHalf.match(/^(.+?)(\d+-\d+-\d+)(.*)$/);

    let name, valueStr, extrasRaw;

    // ② 「4打席4打数1安打」形式にも対応
    if (!mainMatch) {
        // 例：田中4打席4打数1安打
        const jpMatch = lineHalf.match(/^(.+?)(\d+)打席(\d+)打数(\d+)安打(.*)$/);

        if (jpMatch) {
            name = jpMatch[1].trim();
            const pa = Number(jpMatch[2]);
            const ab = Number(jpMatch[3]);
            const hit = Number(jpMatch[4]);
            extrasRaw = jpMatch[5].trim();

            valueStr = `${pa}-${ab}-${hit}`; // 既存処理に合わせるため変換
        } else {
            return; // どちらにも当てはまらない場合は無視
        }
    } else {
        // 3-2-1 形式
        name = mainMatch[1].trim();
        valueStr = mainMatch[2];
        extrasRaw = mainMatch[3].trim();
}


    // ✅ 打撃成績を分解
    const [pa, ab, hit] = valueStr.split('-').map(n => Number(n));

    if (!totals[name]) {
        totals[name] = { pa: 0, ab: 0, hit: 0, extras: {} };
    }

    totals[name].pa += pa;
    totals[name].ab += ab;
    totals[name].hit += hit;

    // ✅ 補足項目を正規表現で全部拾う（スペースなし対応）
    // const extraMatches = [...extrasRaw.matchAll(/(\d+)([^0-9]+)/g)];

    // extraMatches.forEach(match => {
    //     const count = Number(match[1]);
    //     let label = match[2];

    // 全角 → 半角に統一（数字もラベルも）
    const extrasHalf = toHalfWidth(extrasRaw);

    // 全角数字も拾えるように正規表現を修正
    const extraMatches = [...extrasHalf.matchAll(/(\d+)([^0-9]+)/g)];

    extraMatches.forEach(match => {
        const count = Number(match[1]);
        let label = match[2].trim();


        // 四球・死球・四死球 → 四死球に統一
        if (["四球", "死球", "四死球"].includes(label)) {
            label = "四死球";
        }

        if (!totals[name].extras[label]) {
            totals[name].extras[label] = 0;
        }
        totals[name].extras[label] += count;
    });
});


    return totals;
};

function outputresult(totals) {
    const outputArea = document.getElementById("resultArea");
    outputArea.innerHTML = "";

    // ✅ モード取得
    const mode = document.querySelector('input[name="mode"]:checked').value;

    // ✅ totals を配列に変換
    let entries = Object.entries(totals);

    // ✅ 並び替え処理
    if (mode === "avg") {
        // 打率順
        entries.sort((a, b) => {
            const avgA = a[1].ab > 0 ? a[1].hit / a[1].ab : 0;
            const avgB = b[1].ab > 0 ? b[1].hit / b[1].ab : 0;
            return avgB - avgA;
        });
    } else if (mode === "obp") {
        // 出塁率順
        entries.sort((a, b) => {
            const obpA = (a[1].hit + (a[1].extras["四死球"] || 0) + (a[1].extras["敵失"] || 0)) / a[1].pa || 0;
            const obpB = (b[1].hit + (b[1].extras["四死球"] || 0) + (b[1].extras["敵失"] || 0)) / b[1].pa || 0;
            return obpB - obpA;
        });
    } else if (mode === "rbi") {
        // 打点順
        entries.sort((a, b) => {
            const rbiA = a[1].extras["打点"] || 0;
            const rbiB = b[1].extras["打点"] || 0;
            return rbiB - rbiA;
        });
    }

    // ✅ 表示処理（ここはほぼそのまま）
    for (const [name, data] of entries) {
        const { pa, ab, hit, extras } = data;

        const avg = ab > 0 ? (hit / ab).toFixed(3) : "0.000";
        const bb = extras["四死球"] || 0;
        const err = extras["敵失"] || 0;
        const obp = pa > 0 ? ((hit + bb + err) / pa).toFixed(3) : "0.000";

        let text = `${name}：${pa}-${ab}-${hit} 打率 ${avg} 出塁率 ${obp}`;

        const order = ["打点", "四死球", "盗塁", "本塁打", "敵失"];

        order.forEach(label => {
            if (extras[label]) {
                text += ` ${extras[label]}${label}`;
            }
        });

        Object.keys(extras).forEach(label => {
            if (!order.includes(label)) {
                text += ` ${extras[label]}${label}`;
            }
        });

        const p = document.createElement('p');
        p.textContent = text;
        outputArea.appendChild(p);
    }
}


document.getElementById("loadButton")
.addEventListener("click", function(){
    const getText = document.getElementById("textBox").value;
    const totals = calcSumNumber(getText);
    outputresult(totals);
});

// モード切り替え時にもソートして再表示
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener("change", () => {
        const getText = document.getElementById("textBox").value;
        const totals = calcSumNumber(getText);
        outputresult(totals);
    });
});

