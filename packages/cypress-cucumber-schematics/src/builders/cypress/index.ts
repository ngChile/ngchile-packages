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

    context.logger.info(`
        📄 Running Cypress builder version ${version}
    `)

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
    //  Keep updated based in https://docs.cypress.io/guides/guides/module-api.html#Options
    const cypressValidKeys = [
        'browser',
        'ciBuildId',
        'configFile',
        'headed',
        'headless',
        'env',
        'group',
        'key',
        'parallel',
        'port',
        'project',
        'quiet',
        'record',
        'reporter',
        'reporterOptions',
        'spec',
        'tag',
    ].reduce((cypressOptions, option) => {
        //Cypress throws error when an invalid key is passed
        return (options[option] || typeof options[option] === 'object'
            ? { ...cypressOptions, [option]: options[option] } 
            : { ...cypressOptions })
    }, {});
    const additionalCypressConfig = {
        config: {
            baseUrl: options.baseUrl
        },
        ...cypressValidKeys
    };

    context.logger.info(`
👀  Run cypress in mode "${options.mode}" using the following options for Cypress: 
${JSON.stringify(additionalCypressConfig, null, 4)}
        
📖 Check all the options available in the following link: 
https://docs.cypress.io/guides/guides/module-api.html#Options

and add these options in the angular.json section e2e in the architect configuration.
    `);

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

