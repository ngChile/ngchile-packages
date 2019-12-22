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

export enum CypressRunningMode {
    Console = 'console',
    Browser = 'browser'
}

export interface CypressBuilderOptions extends JsonObject {
    devServerTarget?: string;
    mode?: string;
    baseUrl?: string;
    host?: string;
    ciBuildId?: string;
    env?: Record<string, string>;
    group?: string;
    key?: string;
    parallel?: boolean;
    port?: number;
    project?: string;
    record?: boolean;
    reporter?: string;
    reporterPath?: string;
    spec?: string;
}

export default createBuilder<CypressBuilderOptions>(run);

function run(
    options: CypressBuilderOptions,
    context: BuilderContext
): Observable<BuilderOutput> {
    const isConsoleMode = options.mode === CypressRunningMode.Console;

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
        ...(options.ciBuildId ? { ciBuildId: options.ciBuildId } : {}),
        ...(options.configFile ? { configFile: options.configFile } : {}),
        ...(options.env ? { env: options.env } : {}),
        ...(options.group ? { group: options.group } : {}),
        ...(options.key ? { key: options.key } : {}),
        ...(options.parallel ? { parallel: options.parallel } : {}),
        ...(options.project ? { project: options.project } : {}),
        ...(options.record ? { record: options.record } : {}),
        ...(options.reporter ? { reporter: options.reporter } : {}),
        ...(options.spec ? { spec: options.spec } : {})
    };

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

