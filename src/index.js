export default function make(elemSelector, data) {
// prepare data

    /**
     * Насыщение дополнительными данными
     */
// col <-> links
    if (data.links) {
        data.links.forEach((link, linkId) => {
            link.forEach((point) => {
                const { t, c } = point;
                if (!data.tables[t].columns[c].links) {
                    data.tables[t].columns[c].links = [];
                }
                data.tables[t].columns[c].links.push(linkId);
            });
        });
    }

// add tblName to Col
    Object.keys(data.tables)
        .forEach((tblKey) => {
            const tbl = data.tables[tblKey];

            Object.keys(tbl.columns)
                .forEach((colKey) => {
                    const col = tbl.columns[colKey];
                    col.name = colKey;
                    col.tname = tblKey;
                });

            if (!tbl.attr) {
                tbl.attr = {};
            }
            if (!tbl.attr.name) {
                tbl.attr.name = tblKey;
            }
            if (!tbl.attr.x) {
                tbl.attr.x = 0;
            }
            if (!tbl.attr.y) {
                tbl.attr.y = 0;
            }
        });

    /**
     * APP
     */

// *HL - Highlite
    const LINK_COLOR = 'black';
    const LINK_COLOR_HL = 'red';
    const LINK_STROKE_W = 2;
    const LINK_STROKE_W_HL = 4;
    const ROW_HOVER_HL = 'red';
    const ROW_HL = 'pink';

    const svg = d3.select(elemSelector)
        .append('svg')
        .call(d3.zoom().on('zoom', () => {
            svg.attr('transform', d3.event.transform);
        }))
        .append('g');

// Draw tables
    Object.values(data.tables)
        .map(tbl => makeTbl(tbl));

// Drag n Drop
    const dragHandler = d3.drag()
        .on('drag', function (tblAttr) {
            const { x, y } = d3.event;
            d3.select(this)
                .attr('x', x)
                .attr('y', y);

            redrawLinks();

            // save elements position
            tblAttr.x = x;
            tblAttr.y = y;
        });
    dragHandler(d3.selectAll('foreignObject'));

    /**
     * @param tblCfg
     * @returns {*|void}
     */
    function makeTbl(tblCfg) {
        const table = svg
            .data([tblCfg.attr])
            .append('foreignObject')
            .attr('x', tblCfg.attr.x)
            .attr('y', tblCfg.attr.y)
            .append('xhtml:div')
            .append('table')
            .attr('data-table', tblCfg.attr.name);

        const tHead = table
            .append('thead')
            .append('tr')
            .classed('info-ico', !!tblCfg.comment)
            .attr('title', tblCfg.comment);

        tHead
            .append('th')
        tHead
            .append('th')
            .text(tblCfg.attr.name);
        tHead
            .append('th')

        const tBodyTr = table
            .append('tbody')
            .selectAll('tr')
            .data(Object.values(tblCfg.columns))
            .enter()
            .append('tr')
            .classed('info-comment', d => !!d.comment)
            .attr('title', d => d.comment)
            .attr('data-col', d => d.name);

        tBodyTr
            .append('td')
            .text(d => d.id);
        tBodyTr
            .append('td')
            .text(d => d.name);
        tBodyTr
            .append('td')
            .append('span')
            .attr('class', 'info-type')
            .text(d => d.type);

        return table;
    }

    // Highlights on hover
    d3.selectAll('tbody > tr')
        .on('mouseover', function (d) {
            d3.select(this).style('background-color', ROW_HOVER_HL);
            if (d.links) {
                const style = {
                    rowColor: ROW_HL,
                    strokeColor: LINK_COLOR_HL,
                    strokeWidth: LINK_STROKE_W_HL,
                }
                deepFind(d, style);
            }
        })
        .on('mouseout', function (d) {
            d3.select(this).style('background-color', null);
            if (d.links) {
                const style = {
                    rowColor: null,
                    strokeColor: LINK_COLOR,
                    strokeWidth: LINK_STROKE_W,
                }
                deepFind(d, style);
            }
        });

    function deepFind(d, style, visited) {
        if (d.links) {
            if (!visited) {
                visited = new WeakSet();
                visited.add(d);
            }

            d.links.forEach((linkId) => {
                d3.select(`.link-${linkId}`)
                    .attr('stroke', style.strokeColor)
                    .attr('stroke-width', style.strokeWidth);

                data.links[linkId].forEach((point) => {
                    const { t, c } = point;
                    const col1 = data.tables[t].columns[c];
                    if (!visited.has(col1)) {
                        visited.add(col1);
                        d3.select(`table[data-table=${col1.tname}] tr[data-col=${col1.name}]`)
                            .style('background-color', style.rowColor);
                        deepFind(col1, style, visited);
                    }
                });
            });
        }
    }

    /**
     * Links
     */

    const lineFunction = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveStepAfter);

    makeLinks();

    /**
     * Получение координат соединительной линии
     * @param link
     * @returns {*[]}
     */
    function getLinkCoords(link) {
        const t1 = link[0].t;
        const c1 = link[0].c;
        const t2 = link[1].t;
        const c2 = link[1].c;

        const elem = d3.selectAll('tbody>tr')
            .filter(d => (d.name === c1 && d.tname === t1) || (d.name === c2 && d.tname === t2));

        // Выбираем точку и слева и справа
        // Необходимо преобразование координат с поправкой на viewBox
        // todo: canvas position fix
        const coords = elem.nodes().map((e) => {
            const d = e.getBoundingClientRect();
            const transformMtrx = svg.node().getScreenCTM().inverse();
            const transformPoint = d3.select('svg').node().createSVGPoint();

            transformPoint.x = d.x;
            transformPoint.y = d.y + Math.round(d.height / 2);
            const p1 = transformPoint.matrixTransform(transformMtrx);
            transformPoint.x = d.x + d.width;
            transformPoint.y = d.y + Math.round(d.height / 2);
            const p2 = transformPoint.matrixTransform(transformMtrx);

            // dir - Direction, признак, точка слева или справа
            return [
                {
                    x: p2.x,
                    y: p2.y,
                    dir: 1, /* точка справа */
                },
                {
                    x: p1.x,
                    y: p1.y,
                    dir: -1, /* точка слева */
                },
            ];
        });

        // Далее выберем ту пару точек,
        // между которыми наименьшее расстояние:
        // 0.0 - 1.0, 0.0 - 1.1,
        // 0.1 - 1.0, 0.1 - 1.1
        let len = Infinity;
        let p1;
        let p2;
        coords[0].forEach((tp1) => {
            coords[1].forEach((tp2) => {
                const tmpLen = Math.sqrt(
                    (((tp1.x + tp1.dir * 30) - (tp2.x + tp2.dir * 30)) ** 2)
                    + ((tp1.y - tp2.y) ** 2),
                );
                if (tmpLen < len) {
                    len = tmpLen;
                    p1 = tp1;
                    p2 = tp2;
                }
            });
        })

        // p1, p2 - оконечные точки
        // добавляем промежуточные точки, что б сделать вынос линии от таблицы
        const coords4 = [
            p1,
            {
                x: p1.x + p1.dir * 30,
                y: p1.y,
            },
            {
                x: p2.x + p2.dir * 30,
                y: p2.y,
            },
            p2,
        ];

        return coords4;
    }

    /**
     * Добавление соедининтельных линий на холст
     */
    function makeLinks() {
        data.links.forEach((link, linkId) => {
            const coords = getLinkCoords(link);
            svg.append('path')
                .attr('class', `link link-${linkId}`)
                .attr('d', lineFunction(coords))
                .attr('stroke', LINK_COLOR)
                .attr('stroke-width', LINK_STROKE_W)
                .attr('fill', 'none');
        });
    }

    /**
     * Перерисовка соедининтельных линий
     */
    function redrawLinks() {
        data.links.forEach((link, linkId) => {
            const coords = getLinkCoords(link);
            svg.select(`.link-${linkId}`)
                .attr('d', lineFunction(coords));
        });
    }
}
