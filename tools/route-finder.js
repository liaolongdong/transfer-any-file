/**
 * Route finder for /convert/ — inlined by scripts/render-site-pages.mjs.
 *
 * It reads the matrix the page already ships (data-kind / data-steps / data-chain / data-page and
 * the bilingual header labels) instead of carrying a second route table. The file lives under
 * tools/ so the offline and remote-code guards open the same source that is published; tools/ is
 * never bundled into the extension.
 */
(function () {
  var from = document.getElementById('finderFrom');
  var to = document.getElementById('finderTo');
  var out = document.getElementById('finderOut');
  var table = document.getElementById('mx-table');
  if (!from || !to || !out || !table) return;

  var columns = [].slice.call(table.querySelectorAll('thead th[data-f]')).map(function (th) {
    return th.getAttribute('data-f');
  });
  var labels = {};
  var hubs = {};
  var cells = {};
  [].slice.call(table.querySelectorAll('th[data-f]')).forEach(function (th) {
    var code = th.getAttribute('data-f');
    var zh = th.querySelector('span[lang="zh-CN"]');
    var en = th.querySelector('span[lang="en"]');
    labels[code] = { zh: zh ? zh.textContent : code, en: en ? en.textContent : code };
  });
  [].slice.call(table.querySelectorAll('tbody tr')).forEach(function (tr) {
    var head = tr.querySelector('th[data-f]');
    if (!head) return;
    var source = head.getAttribute('data-f');
    var hub = head.querySelector('a');
    if (hub) hubs[source] = hub.getAttribute('href');
    var tds = tr.querySelectorAll('td');
    columns.forEach(function (column, i) {
      if (tds[i]) cells[source + '->' + column] = tds[i];
    });
  });

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function bilingual(text, tag, className) {
    var node = el(tag || 'span', className);
    [
      ['zh-CN', text.zh],
      ['en', text.en],
    ].forEach(function (pair) {
      var span = document.createElement('span');
      span.setAttribute('lang', pair[0]);
      span.textContent = pair[1];
      node.appendChild(span);
    });
    return node;
  }

  function chip(code) {
    var node = el('span', 'chip');
    var copy = labels[code] || { zh: code, en: code };
    [
      ['zh-CN', copy.zh],
      ['en', copy.en],
    ].forEach(function (pair) {
      var span = document.createElement('span');
      span.setAttribute('lang', pair[0]);
      span.textContent = pair[1];
      node.appendChild(span);
    });
    return node;
  }

  function reset() {
    while (out.firstChild) out.removeChild(out.firstChild);
  }

  function hint(text) {
    out.appendChild(bilingual(text, 'p', 'finder-hint'));
  }

  function cellText(cell, lang) {
    var node = cell.querySelector('.mx-sr[lang="' + lang + '"]');
    return node ? node.textContent : '';
  }

  function routeCard(cell) {
    var card = el('div', 'route-card finder-route');
    card.appendChild(bilingual({ zh: '这条链路怎么走', en: 'How the route runs' }, 'p', 'route-label'));
    var steps = el('p', 'route-steps');
    var chain = (cell.getAttribute('data-chain') || '').split('>').filter(Boolean);
    chain.forEach(function (code, i) {
      if (i) {
        var arrow = el('span', 'arrow');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        steps.appendChild(arrow);
      }
      steps.appendChild(chip(code));
    });
    card.appendChild(steps);
    var count = Number(cell.getAttribute('data-steps')) || 0;
    card.appendChild(
      bilingual(
        {
          zh: count + ' 步，由扩展自动选出，中间产物不落盘。',
          en:
            count + (count === 1 ? ' step' : ' steps') + ', chosen by the extension; no intermediate touches the disk.',
        },
        'p',
        'route-note',
      ),
    );
    var href = cell.getAttribute('data-page');
    if (href) {
      var link = el('a', 'finder-link');
      link.href = href;
      var isPage = cell.getAttribute('data-dest') === 'page';
      link.appendChild(
        bilingual({
          zh: isPage ? '查看这一对的完整说明 →' : '查看来源格式页 →',
          en: isPage ? 'Read the full write-up →' : 'Open the source-format page →',
        }),
      );
      card.appendChild(link);
    }
    out.appendChild(card);
  }

  function blockedCard(cell, source) {
    var card = el('div', 'route-card finder-route finder-blocked');
    card.appendChild(bilingual({ zh: '界面不提供这个组合', en: 'The picker greys this pair out' }, 'p', 'route-label'));
    card.appendChild(
      bilingual(
        {
          zh: cellText(cell, 'zh-CN') || '这条组合在语义上无效。',
          en: cellText(cell, 'en') || 'This pair is semantically invalid.',
        },
        'p',
        'route-note',
      ),
    );
    var hub = hubs[source];
    if (hub) {
      var link = el('a', 'finder-link');
      link.href = hub;
      link.appendChild(bilingual({ zh: '查看来源格式页 →', en: 'Open the source-format page →' }));
      card.appendChild(link);
    }
    out.appendChild(card);
  }

  function render() {
    reset();
    if (!from.value || !to.value) {
      hint({ zh: '选两个格式，看看它走几步。', en: 'Choose two formats to see how many steps it takes.' });
      return;
    }
    if (from.value === to.value) {
      hint({
        zh: '源与目标是同一格式，没有转换这回事。',
        en: 'A format meeting itself — there is no conversion here.',
      });
      return;
    }
    var cell = cells[from.value + '->' + to.value];
    if (!cell) {
      hint({ zh: '这条组合没有可达路径。', en: 'No reachable route for this pair.' });
      return;
    }
    var kind = cell.getAttribute('data-kind');
    if (kind === 'block') {
      blockedCard(cell, from.value);
      return;
    }
    if (kind === 'open') {
      routeCard(cell);
      return;
    }
    hint({ zh: '这条组合没有可达路径。', en: 'No reachable route for this pair.' });
  }

  from.addEventListener('change', render);
  to.addEventListener('change', render);
  render();
  document.getElementById('finder').classList.add('finder-live');
})();
