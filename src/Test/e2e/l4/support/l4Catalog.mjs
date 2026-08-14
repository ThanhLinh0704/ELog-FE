export function buildL4Cases(catalog, channel) {
  const seen = new Set();
  for (const item of catalog) {
    if (seen.has(item.id)) {
      throw new Error(`duplicate L4 Test ID: ${item.id}`);
    }
    seen.add(item.id);
  }
  return catalog.filter((item) => item.entryPoint?.channel === channel);
}

export function parseJsonText(text) {
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

export function resolveRoute(route, fixtureIds) {
  return route.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_, key) => {
    const value = fixtureIds[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`missing fixture id for :${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

export function buildExecutionLedger(catalog, webResults, mobileReason, mobileResults = new Map()) {
  const results = catalog.map((item) => {
    const channel = item.entryPoint?.channel;
    if (channel === 'Web') {
      const execution = webResults.get(item.id);
      if (!execution) {
        throw new Error(`missing Cypress result for ${item.id}`);
      }
      return {
        id: item.id,
        title: item.title,
        channel,
        status: execution.status,
        rawCypressStatus: execution.rawCypressStatus || execution.status,
        durationSeconds: execution.durationSeconds,
        failure: execution.failure || null,
        invocation: `cypress run --spec e2e/l4/report5-web.cy.ts --env grep=${item.id}`,
      };
    }

    const mobileExecution = mobileResults.get(item.id);
    if (mobileExecution) {
      return {
        id: item.id,
        title: item.title,
        channel,
        status: mobileExecution.status,
        durationSeconds: mobileExecution.durationSeconds ?? null,
        failure: mobileExecution.failure || null,
        evidence: mobileExecution.evidence || [],
        invocation: mobileExecution.invocation
          || `flutter test integration_test/report5_l4_mobile_test.dart --plain-name "${item.id} — ${item.title}"`,
      };
    }

    return {
      id: item.id,
      title: item.title,
      channel,
      status: 'Not Run',
      durationSeconds: null,
      failure: mobileReason,
      invocation: `flutter test integration_test/report5_l4_mobile_test.dart --plain-name "${item.id} — ${item.title}"`,
    };
  });

  return {
    totals: {
      total: results.length,
      pass: results.filter((item) => item.status === 'Pass').length,
      fail: results.filter((item) => item.status === 'Fail').length,
      notRun: results.filter((item) => item.status === 'Not Run').length,
    },
    results,
  };
}
