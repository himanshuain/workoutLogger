import { groupExercisesByArea } from "@/lib/exerciseAreaGroups";
import { sortRoutinesByName } from "@/lib/routineSplits";

const PDF_PAGE_WIDTH = 794;
const PDF_PAGE_MAX_HEIGHT = 1040;

const PDF_STYLES = `
  .pdf-page {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
      "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
    font-size: 11px;
    line-height: 1.3;
    color: #1a1a1a;
    background: #fff;
    width: ${PDF_PAGE_WIDTH}px;
    padding: 8px 12px;
    box-sizing: border-box;
  }
  .pdf-page * { box-sizing: border-box; }
  .pdf-block { margin-bottom: 10px; }
  .pdf-block:last-child { margin-bottom: 0; }
  .title-row {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 3px;
  }
  .stats-row {
    font-size: 10px;
    color: #444;
    margin: 0;
  }
  .pdf-divider { border: none; border-top: 1px solid #ddd; margin: 8px 0; }
  .split-header {
    background: #d91a11;
    color: #fff;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    margin: 0 0 5px;
    text-align: center;
  }
  .area-label {
    font-size: 9px;
    font-weight: 700;
    color: #666;
    margin: 0 0 3px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .exercise-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 4px;
  }
  .exercise-table td {
    padding: 2px 0;
    vertical-align: top;
    font-size: 10px;
  }
  .exercise-table .name {
    width: 58%;
    font-weight: 600;
    color: #111;
    padding-right: 10px;
    word-break: break-word;
  }
  .exercise-table .notes {
    width: 42%;
    color: #555;
    text-align: right;
    word-break: break-word;
  }
`;

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text != null && text !== "") node.textContent = text;
  return node;
}

function routineToSplitExport(routine) {
  const exercises = (routine?.routine_exercises || []).map(ex => ({
    exercise_name: ex.exercise_name,
    category: ex.category || "other",
    target_sets: ex.target_sets || 3,
    is_pinned: Boolean(ex.is_pinned),
    notes: ex.notes != null && String(ex.notes).trim() ? String(ex.notes).trim() : null,
  }));

  return {
    id: routine.id,
    name: (routine.name || "").trim() || "Untitled split",
    exercises,
  };
}

/** Build export payload from saved routines, optionally replacing one split with unsaved draft. */
export function buildSplitsExportPayload(routines, { draftOverride } = {}) {
  const sorted = sortRoutinesByName(routines || []);
  const splits = sorted.map(routine => {
    if (draftOverride?.id && draftOverride.id === routine.id) {
      return {
        id: routine.id,
        name: (draftOverride.name || routine.name || "").trim() || "Untitled split",
        exercises: (draftOverride.exercises || []).map(ex => ({
          exercise_name: ex.exercise_name,
          category: ex.category || "other",
          target_sets: ex.target_sets || 3,
          is_pinned: Boolean(ex.is_pinned),
          notes: ex.notes != null && String(ex.notes).trim() ? String(ex.notes).trim() : null,
        })),
      };
    }
    return routineToSplitExport(routine);
  });

  const exerciseCount = splits.reduce((sum, split) => sum + split.exercises.length, 0);

  return {
    exported_at: new Date().toISOString(),
    splits,
    summary: {
      split_count: splits.length,
      exercise_count: exerciseCount,
    },
  };
}

export function splitsExportFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `workout-splits-${stamp}.pdf`;
}

function appendSplitExerciseRows(doc, parent, exercises) {
  const table = el(doc, "table", "exercise-table");
  const tbody = doc.createElement("tbody");
  exercises.forEach(ex => {
    const row = doc.createElement("tr");
    const nameCell = doc.createElement("td");
    nameCell.className = "name";
    nameCell.textContent = `${ex.is_pinned ? "Pinned · " : ""}${ex.exercise_name || "Exercise"}`;
    const notesCell = doc.createElement("td");
    notesCell.className = "notes";
    notesCell.textContent = ex.notes || "—";
    row.appendChild(nameCell);
    row.appendChild(notesCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  parent.appendChild(table);
}

function buildSplitBlock(doc, split) {
  const block = el(doc, "div", "pdf-block");
  const count = split.exercises.length;
  block.appendChild(el(
    doc,
    "div",
    "split-header",
    `${split.name} · ${count} exercise${count === 1 ? "" : "s"}`,
  ));

  if (count === 0) {
    block.appendChild(el(doc, "p", null, "No exercises in this split."));
    return block;
  }

  const groups = groupExercisesByArea(split.exercises, ex => ex.category);
  groups.forEach(group => {
    if (groups.length > 1) {
      block.appendChild(el(doc, "div", "area-label", group.label));
    }
    appendSplitExerciseRows(doc, block, group.exercises);
  });

  return block;
}

function buildHeaderBlock(doc, payload) {
  const block = el(doc, "div", "pdf-block");
  block.appendChild(el(doc, "p", "title-row", "Workout Splits"));
  block.appendChild(el(
    doc,
    "p",
    "stats-row",
    `${payload.summary.split_count} split${payload.summary.split_count === 1 ? "" : "s"} · ${payload.summary.exercise_count} exercises`,
  ));
  block.appendChild(el(doc, "hr", "pdf-divider"));
  return block;
}

function createPageShell(doc) {
  return el(doc, "div", "pdf-page");
}

function packPdfPages(blocks, doc, mount) {
  const pages = [];
  let page = createPageShell(doc);
  mount.appendChild(page);

  blocks.forEach(block => {
    page.appendChild(block);
    if (page.scrollHeight > PDF_PAGE_MAX_HEIGHT && page.childNodes.length > 1) {
      page.removeChild(block);
      pages.push(page);
      page = createPageShell(doc);
      mount.appendChild(page);
      page.appendChild(block);
    }
  });

  if (page.childNodes.length > 0) {
    pages.push(page);
  }

  return pages;
}

function buildContentBlocks(payload, doc) {
  const blocks = [buildHeaderBlock(doc, payload)];
  if (payload.splits.length === 0) {
    blocks.push(el(doc, "div", "pdf-block", "No splits saved yet."));
    return blocks;
  }
  payload.splits.forEach(split => {
    blocks.push(buildSplitBlock(doc, split));
  });
  return blocks;
}

function waitForLayout() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function renderToCanvas(element) {
  const html2canvas = (await import("html2canvas")).default;
  const height = element.scrollHeight;
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: PDF_PAGE_WIDTH,
    height,
    windowWidth: PDF_PAGE_WIDTH,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
  });
}

/** Generate and download a PDF of all workout splits. */
export async function downloadSplitsPdf(payload, filename = splitsExportFilename()) {
  if (typeof document === "undefined") {
    throw new Error("PDF export is only available in the browser");
  }

  if (!payload?.summary || !Array.isArray(payload?.splits)) {
    throw new Error("Invalid export data");
  }

  const { jsPDF } = await import("jspdf");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:794px;border:0;opacity:0;pointer-events:none;z-index:999999;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    document.body.removeChild(iframe);
    throw new Error("PDF export failed to initialize");
  }

  idoc.open();
  idoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PDF_STYLES}</style></head><body style="margin:0;background:#fff;color:#1a1a1a;"></body></html>`,
  );
  idoc.close();

  const mount = idoc.body;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageWidth - margin * 2;

  try {
    const blocks = buildContentBlocks(payload, idoc);
    const pages = packPdfPages(blocks, idoc, mount);
    await waitForLayout();

    if (pages.length === 0) {
      throw new Error("PDF export produced no content");
    }

    for (let i = 0; i < pages.length; i += 1) {
      const pageEl = pages[i];
      iframe.style.height = `${Math.max(pageEl.scrollHeight, 80)}px`;
      await waitForLayout();

      const canvas = await renderToCanvas(pageEl);
      if (!canvas.width || !canvas.height) continue;

      if (i > 0) pdf.addPage();
      let drawW = contentW;
      let drawH = (canvas.height * drawW) / canvas.width;
      const maxH = pdf.internal.pageSize.getHeight() - margin * 2;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = (canvas.width * drawH) / canvas.height;
      }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, drawW, drawH);
    }

    pdf.save(filename);
  } finally {
    mount.innerHTML = "";
    document.body.removeChild(iframe);
  }
}
