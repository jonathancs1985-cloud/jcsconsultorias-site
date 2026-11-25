(function (root) {
  async function readJson(url) {
    const response = await fetch(url, {credentials: "omit"});
    if (!response.ok) throw new Error("Não foi possível abrir a base da demonstração.");
    return response.json();
  }

  function createArchive(base, catalog) {
    const cache = new Map();
    function read(entry) {
      if (!entry) throw new Error("Consulta pendente na base de demonstração.");
      const url = new URL(entry.path, base).href;
      if (!cache.has(url)) {
        cache.set(url, readJson(url).catch(error => {
          cache.delete(url);
          throw error;
        }));
      }
      return cache.get(url);
    }

    return async function lookup(path, scenario) {
      const route = new URL(path, base);
      const name = route.pathname.split("/").at(-1);
      const filters = route.searchParams;
      const cycle = filters.get("cycle_id");
      if (cycle && Number(cycle) !== catalog.cycle) throw new Error("Ciclo indisponível na base fixa.");
      const edition = catalog.scenarios[String(filters.get("scenario_number") || scenario)];
      const ranking = name === "indicator-ranking";
      const entry = ranking ? catalog.rankings[filters.get("indicator_key")] : edition?.[name] || catalog.shared[name];
      const payload = ranking && !entry ? {value: []} : await read(entry);
      const statuses = filters.getAll("regulatory_status");
      const group = filters.get("controller_group");
      const groupIds = group ? new Set(catalog.groups[group] || []) : null;
      const members = (group || statuses.length) ? (await read(catalog.shared.participants)).value.filter(row =>
        (!groupIds || groupIds.has(row.participant_id)) && (!statuses.length || statuses.includes(row.regulatory_status))) : null;
      const allowed = members ? new Set(members.map(row => String(row.participant_id))) : null;
      const groupSummaryNames = ["consumer-summary", "operational-vehicle-summary", "operational-vehicle-monthly",
        "indicator-scope", "works", "works-summary"];
      if (group && !filters.has("participant_id") && allowed?.size && groupSummaryNames.includes(name)) {
        filters.set("participant_id", String(Math.min(...members.map(row => row.participant_id))));
      }
      const keys = ["participant_id", "macro_key", "indicator_key", "vehicle_type"];
      const rows = payload.value.filter(row =>
        (!allowed || row.participant_id == null || allowed.has(String(row.participant_id))) &&
        keys.every(key => !filters.has(key) || row[key] == null || String(row[key]) === filters.get(key))
      );
      if (name === "indicator-catalog" && allowed) {
        const indicators = (await read(edition["indicator-results"])).value;
        const available = new Set(indicators.filter(row => allowed.has(String(row.participant_id))).map(row => row.indicator_key));
        const filtered = rows.filter(row => available.has(row.indicator_key));
        rows.splice(0, rows.length, ...filtered);
      }
      const offset = Number(filters.get("offset") || 0);
      const limit = Number(filters.get("limit") || rows.length);
      const page = rows.slice(offset, offset + limit);
      return {...payload, value: page, count: page.length, total: rows.length, offset, limit,
        truncated: offset + page.length < rows.length};
    };
  }

  root.RcrArchive = {createArchive, readJson};
})(globalThis);
