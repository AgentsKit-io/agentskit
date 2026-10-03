#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const DEFAULT_RUNS = 30;
const RUN_FIELDS = 'databaseId,attempt,createdAt,startedAt,updatedAt,conclusion,event,headBranch,headSha,url';

function parseArgs(argv) {
  const options = { runs: DEFAULT_RUNS, format: 'markdown' };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--runs') {
      options.runs = Number(argv[index + 1]);
      index += 1;
    } else if (argument === '--format') {
      options.format = argv[index + 1];
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!Number.isInteger(options.runs) || options.runs < 1 || options.runs > 100) {
    throw new Error('--runs must be an integer from 1 to 100');
  }
  if (!['markdown', 'json'].includes(options.format)) {
    throw new Error('--format must be markdown or json');
  }
  return options;
}

function ghJson(args) {
  const output = execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(output);
}

function elapsedSeconds(start, end) {
  const startTime = Date.parse(start ?? '');
  const endTime = Date.parse(end ?? '');
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime
    ? (endTime - startTime) / 1000
    : null;
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}

function summarize(values) {
  const valid = values.filter((value) => value !== null && Number.isFinite(value));
  return {
    samples: valid.length,
    p50Seconds: percentile(valid, 0.5),
    p90Seconds: percentile(valid, 0.9),
  };
}

function collectRuns(runs) {
  return runs.map((run) => {
    const detail = ghJson(['run', 'view', String(run.databaseId), '--json', 'jobs,createdAt,startedAt,updatedAt,conclusion,attempt']);
    const jobs = detail.jobs.map((job) => ({
      name: job.name,
      conclusion: job.conclusion,
      seconds: elapsedSeconds(job.startedAt, job.completedAt),
      completedAt: job.completedAt,
      steps: job.steps
        .map((step) => ({ name: step.name, conclusion: step.conclusion, seconds: elapsedSeconds(step.startedAt, step.completedAt) }))
        .filter((step) => step.seconds !== null),
    }));
    const firstStart = detail.jobs
      .filter((job) => job.steps.some((step) => step.startedAt && step.completedAt))
      .map((job) => job.startedAt)
      .filter(Boolean)
      .sort()[0] ?? null;

    return {
      id: run.databaseId,
      attempt: detail.attempt ?? run.attempt ?? 1,
      createdAt: detail.createdAt ?? run.createdAt,
      startedAt: firstStart,
      conclusion: detail.conclusion ?? run.conclusion,
      event: run.event,
      headBranch: run.headBranch,
      headSha: run.headSha,
      url: run.url,
      queueSeconds: elapsedSeconds(detail.createdAt ?? run.createdAt, firstStart),
      durationSeconds: elapsedSeconds(
        detail.createdAt ?? run.createdAt,
        jobs.map((job) => job.completedAt).filter(Boolean).sort().at(-1),
      ),
      jobs,
    };
  });
}

function summarizeCohort(name, runs) {
  const jobTimes = new Map();
  const stepTimes = new Map();
  for (const run of runs) {
    for (const job of run.jobs) {
      if (job.seconds !== null) {
        if (!jobTimes.has(job.name)) jobTimes.set(job.name, []);
        jobTimes.get(job.name).push(job.seconds);
      }
      for (const step of job.steps) {
        if (!stepTimes.has(step.name)) stepTimes.set(step.name, []);
        stepTimes.get(step.name).push(step.seconds);
      }
    }
  }

  const rows = (entries) => [...entries]
    .map(([label, values]) => ({ name: label, ...summarize(values) }))
    .sort((left, right) => (right.p50Seconds ?? 0) - (left.p50Seconds ?? 0));
  const completed = runs.length;
  return {
    name,
    runs: completed,
    failures: runs.filter((run) => run.conclusion === 'failure').length,
    failureRate: completed ? runs.filter((run) => run.conclusion === 'failure').length / completed : 0,
    reruns: runs.filter((run) => run.attempt > 1).length,
    rerunRate: completed ? runs.filter((run) => run.attempt > 1).length / completed : 0,
    queue: summarize(runs.map((run) => run.queueSeconds)),
    totalDuration: summarize(runs.map((run) => run.durationSeconds)),
    jobs: rows(jobTimes),
    topSteps: rows(stepTimes).slice(0, 10),
  };
}

function seconds(value) {
  return value === null ? 'n/a' : `${value.toFixed(1)}s`;
}

function markdownReport(reports, count) {
  const lines = [
    `# CI timing report (last ${count} completed runs per cohort)`,
    '',
    `Generated ${new Date().toISOString()}. Source: \`gh run list\` and \`gh run view --json jobs\` for workflow \`ci.yml\`. Percentiles use nearest-rank; step names are grouped exactly as GitHub reports them.`,
    '',
    '## Summary',
    '',
    '| Cohort | Runs | Failures | Reruns | Queue p50 | Queue p90 | Total p50 | Total p90 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const report of reports) {
    lines.push(`| ${report.name} | ${report.runs} | ${report.failures} (${(100 * report.failureRate).toFixed(1)}%) | ${report.reruns} (${(100 * report.rerunRate).toFixed(1)}%) | ${seconds(report.queue.p50Seconds)} | ${seconds(report.queue.p90Seconds)} | ${seconds(report.totalDuration.p50Seconds)} | ${seconds(report.totalDuration.p90Seconds)} |`);
  }

  for (const report of reports) {
    lines.push('', `## ${report.name}: 10 slowest steps by p50`, '', '| Step | Samples | p50 | p90 |', '| --- | ---: | ---: | ---: |');
    for (const step of report.topSteps) {
      lines.push(`| ${step.name.replaceAll('|', '\\|')} | ${step.samples} | ${seconds(step.p50Seconds)} | ${seconds(step.p90Seconds)} |`);
    }
    lines.push('', `## ${report.name}: jobs`, '', '| Job | Samples | p50 | p90 |', '| --- | ---: | ---: | ---: |');
    for (const job of report.jobs) {
      lines.push(`| ${job.name.replaceAll('|', '\\|')} | ${job.samples} | ${seconds(job.p50Seconds)} | ${seconds(job.p90Seconds)} |`);
    }
  }

  lines.push('', '> Queue is run creation to first job start. Total duration is run creation to the latest completed job. Failure and rerun rates use the sampled completed run records; GitHub concurrency cancellations and skipped jobs are not counted as failures. Job/step duration samples include only records with both timestamps.', '');
  return lines.join('\n');
}

function usage() {
  return 'Usage: pnpm ci:timing [--runs N] [--format markdown|json]\nDefaults to 30 completed main runs and 30 completed pull-request runs.';
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }

  const queryRuns = (args) => ghJson(['run', 'list', ...args, '--workflow', 'ci.yml', '--status', 'completed', '--limit', String(options.runs), '--json', RUN_FIELDS]);
  const mainRuns = queryRuns(['--branch', 'main']);
  const prRuns = queryRuns(['--event', 'pull_request']);
  const reports = [
    summarizeCohort('main', collectRuns(mainRuns)),
    summarizeCohort('pull_request', collectRuns(prRuns)),
  ];
  const result = { workflow: 'ci.yml', sampledAt: new Date().toISOString(), requestedRunsPerCohort: options.runs, cohorts: reports };

  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${markdownReport(reports, options.runs)}\n`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n${usage()}\n`);
  process.exitCode = 1;
}
