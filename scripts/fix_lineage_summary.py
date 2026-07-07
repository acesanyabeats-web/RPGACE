src = open('mod_taxonomyTree.js', encoding='utf-8').read()

old = """    var pathPreview = document.createElement('div');
    pathPreview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:16px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;';
    function updatePreview() {
      pathPreview.textContent = proposal.phylumName + ' → ' + proposal.path.join(' → ');
    }
    updatePreview();
    box.appendChild(pathPreview);"""

new = """    var pathPreview = document.createElement('div');
    pathPreview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:10px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;';
    function updatePreview() {
      pathPreview.textContent = proposal.phylumName + ' → ' + proposal.path.join(' → ');
    }
    updatePreview();
    box.appendChild(pathPreview);

    // ── Scrollable summary: what each step actually means, so the user
    // ── can make an informed accept/edit/reject decision, not a blind guess
    var summaryLabel = document.createElement('div');
    summaryLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(155,89,182,0.5);margin-bottom:6px;';
    summaryLabel.textContent = 'What each step means';
    box.appendChild(summaryLabel);

    var summaryBox = document.createElement('div');
    summaryBox.id = 'taxtree-summary-box';
    summaryBox.style.cssText = 'max-height:180px;overflow-y:auto;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;margin-bottom:16px;';

    function renderSummary() {
      summaryBox.innerHTML = '';

      // Root phylum context first
      var phylumRow = document.createElement('div');
      phylumRow.style.cssText = 'margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.05);';
      phylumRow.innerHTML = '<div style="font-size:11px;font-weight:700;color:#9B59B6;">' + proposal.phylumName + ' (Phylum ' + proposal.phylumNumber + ')</div>' +
        '<div style="font-size:10px;color:rgba(226,226,236,0.4);margin-top:2px;">' + (self.PHYLUM_ENGLISH[proposal.phylumNumber] || 'Root category') + '</div>';
      summaryBox.appendChild(phylumRow);

      proposal.path.forEach(function(stepName, i) {
        var isLeaf = (i === proposal.path.length - 1);
        var row = document.createElement('div');
        row.style.cssText = 'margin-bottom:10px;padding-bottom:10px;' + (i < proposal.path.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.05);' : '');

        var indent = '&nbsp;&nbsp;'.repeat(i);
        var arrow = i === 0 ? '' : '↳ ';
        var nameLine = document.createElement('div');
        nameLine.style.cssText = 'font-size:11px;font-weight:700;color:' + (isLeaf ? '#3DAA6E' : '#E2E2EC') + ';';
        nameLine.innerHTML = indent + arrow + (isLeaf ? '🎯 ' : '📁 ') + stepName + (isLeaf ? ' <span style="font-size:9px;color:rgba(61,170,110,0.6);">(specific leaf topic)</span>' : ' <span style="font-size:9px;color:rgba(226,226,236,0.25);">(grouping)</span>');
        row.appendChild(nameLine);

        var explainerText = proposal.explainers[i];
        if (explainerText) {
          var explLine = document.createElement('div');
          explLine.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.5);margin-top:3px;line-height:1.5;' + (i > 0 ? 'padding-left:' + (i * 12) + 'px;' : '');
          explLine.textContent = explainerText;
          row.appendChild(explLine);
        }
        summaryBox.appendChild(row);
      });
    }
    renderSummary();
    box.appendChild(summaryBox);"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('mod_taxonomyTree.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: scrollable summary panel added, showing per-step explainers")
else:
    print("ERROR: anchor not found")
