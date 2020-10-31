import { JsonObject } from '@angular-devkit/core';
import {
    BuilderContext,
    BuilderOutput,
    createBuilder,
    scheduleTargetAndForget,
    targetFromTargetString
} from '@angular-devkit/architect';
import { Observable, of, noop, from } from 'rxjs';
import { concatMap, map, take, tap, catchError } from 'rxjs/operators';

const cypress = require('cypress');
const { version } = require('../../../package.json');

export enum CypressRunningMode {
    Console = 'console',
    Browser = 'browser'
}

// TODO: Make a better interface using cypress types
export interface CypressBuilderOptions extends JsonObject {
    devServerTarget?: string;
    mode?: string;
    baseUrl?: string;

    // Keep updated based in https://docs.cypress.io/guides/guides/module-api.html#Options
    browser?: string;
    ciBuildId?: string;
    //The "config" option it is mandatory and added in the function executeCypress
    //config?: Record<string, string>;
    configFile?: string | boolean;
    env?: Record<string, string>;
    group?: string;
    headed?: boolean;
    headless?: boolean;
    key?: string;
    exit?: boolean;
    parallel?: boolean;
    port?: number;
    project?: string;
    quiet?: boolean;
    record?: boolean;
    reporter?: string;
    reporterOptions?: string;
    spec?: string;
    tag?: string;
}

export default createBuilder<CypressBuilderOptions>(run);

function run(
    options: CypressBuilderOptions,
    context: BuilderContext
): Observable<BuilderOutput> {
    const isConsoleMode = options.mode === CypressRunningMode.Console;

    context.logger.info(`Running Cypress builder version ${version}`)

    return (options.devServerTarget
        ? startDevServer(options.devServerTarget, true, context)
        : of({ success: true })
    ).pipe(
        concatMap(({ success }) =>
            isConsoleMode && !success
                ? of({ success })
                : executeCypress(options, context)
        ),
        isConsoleMode
            ? take(1)
            : tap(noop),
        catchError(error => {
            context.reportStatus(`Error: ${error.message}`);
            context.logger.error(error.message);
            return of({ success: false });
        })
    );
};

function startDevServer(
    devServerTarget: string,
    isWatching: boolean,
    context: BuilderContext
): Observable<BuilderOutput> {
    // Overrides dev server watch setting.
    const overrides = {
        watch: isWatching
    };
    return scheduleTargetAndForget(
        context,
        targetFromTargetString(devServerTarget),
        overrides
    );
}

function executeCypress(
    options: CypressBuilderOptions,
    context: BuilderContext
): Observable<BuilderOutput> {
    const additionalCypressConfig = {
        config: {
            baseUrl: options.baseUrl
        },
        /* TODO find better way to handle this */
        ...(options.browser ? { browser: options.browser } : {}),
        ...(options.ciBuildId ? { ciBuildId: options.ciBuildId } : {}),
        ...(options.configFile ? { configFile: options.configFile } : {}),
        ...(options.headed ? { headed: options.headed } : {}),
        ...(options.headless ? { headless: options.headless } : {}),
        ...(options.env ? { env: options.env } : {}),
        ...(options.group ? { group: options.group } : {}),
        ...(options.key ? { key: options.key } : {}),
        ...(options.parallel ? { parallel: options.parallel } : {}),
        ...(options.port ? { port: options.port } : {}),
        ...(options.project ? { project: options.project } : {}),
        ...(options.quiet ? { quiet: options.quiet } : {}),
        ...(options.record ? { record: options.record } : {}),
        ...(options.reporter ? { reporter: options.reporter } : {}),
        ...(options.reporterOptions ? { reporterOptions: options.reporterOptions } : {}),
        ...(options.spec ? { spec: options.spec } : {}),
        ...(options.tag ? { tag: options.tag } : {})
    };

    context.logger.info(`Run cypress in mode ${options.mode} using the following options for Cypress: ${JSON.stringify(additionalCypressConfig)}`);

    return from<any>(
        options.mode === CypressRunningMode.Console
            ? cypress.run(additionalCypressConfig)
            : cypress.open(additionalCypressConfig)
    ).pipe(
        map((result: any) => ({
            /**
             * `cypress.open` is returning `0` and is not of the same type as `cypress.run`.
             * `cypress.open` is the graphical UI, so it will be obvious to know what wasn't
             * working. Forcing the build to success when `cypress.open` is used.
             */
            success: result.hasOwnProperty(`totalFailed`)
                ? result.totalFailed === 0
                : true
        }))
    );
}

