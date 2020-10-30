import { Architect,  scheduleTargetAndForget, targetFromTargetString } from '@angular-devkit/architect';
import { TestingArchitectHost } from '@angular-devkit/architect/testing/';
import { schema } from '@angular-devkit/core';
import { normalize } from 'path';
import { of, throwError } from 'rxjs';
import { CypressBuilderOptions } from '.';

const cypress = require('cypress');

jest.mock('cypress', () => ({
    run: jest.fn(),
    open: jest.fn(),
}));

describe('Integration Test: Ngx Devkit Cypress Builder', () => {
    let architect: Architect;
    let architectHost: TestingArchitectHost;
    const cypressOptions: CypressBuilderOptions = {
        devServerTarget: 'web-app:serve',
        mode: 'console',
        baseUrl: 'http://localhost:80',
        env: {
            API_URL: 'http://localhost:8080/api/v1/users'
        }
    };

    beforeEach(async () => {
        const registry = new schema.CoreSchemaRegistry();
        registry.addPostTransform(schema.transforms.addUndefinedDefaults);
    
        // Arguments to TestingArchitectHost are workspace and current directories.
        // Since we don't use those, both are the same in this case.
        architectHost = new TestingArchitectHost();
        architect = new Architect(architectHost, registry);
    
        // This will either take a Node package name, or a path to the directory
        // for the package.json file.
        const packageJsonPath = normalize(`${__dirname}/../../..`);
        await architectHost.addBuilderFromPackage(packageJsonPath);

        cypress.run.mockReset();
        cypress.open.mockReset();
        (targetFromTargetString as any) = jest
            .fn()
            .mockReturnValue(null);
    });

    it('should use cypress run in console mode and run successfully if are not failed tests', async () => {
        //Arrange values for tests
        const testsResult = { totalFailed: 0 };
        cypress.run.mockReturnValue(Promise.resolve(testsResult));
        (scheduleTargetAndForget as any) = jest
            .fn()
            .mockReturnValue(
                of({ success: true })
            );

        // Execute the builder and wait for results
        const run = await architect.scheduleBuilder(
            '@ngchile/cypress-cucumber-schematics:cypress', 
            cypressOptions,
        );
        const output = await run.result;
        await run.stop();

        // Expectations
        const {
            mode,
            baseUrl,
            devServerTarget,
            ...expectedCypressOptions
        } = cypressOptions;

        expect(output.success).toBe(true);
        expect(cypress.run).toHaveBeenCalledWith({ 
            config: { baseUrl },
            ...expectedCypressOptions,
        });
        expect(scheduleTargetAndForget).toHaveBeenCalled();
        expect(targetFromTargetString).toHaveBeenCalledWith(devServerTarget);
    });

    it('should use cypress run in console mode and run failed if are at least 1 failed test', async () => {
        const testsResult = { totalFailed: 1 };
        cypress.run.mockReturnValue(Promise.resolve(testsResult));
        (scheduleTargetAndForget as any) = jest
            .fn()
            .mockReturnValue(
                of({ success: true })
            );

        const run = await architect.scheduleBuilder(
            '@ngchile/cypress-cucumber-schematics:cypress', 
            cypressOptions,
        );
        const output = await run.result;
        await run.stop();

        const {
            mode,
            baseUrl,
            devServerTarget,
            ...expectedCypressOptions
        } = cypressOptions;

        expect(output.success).toBe(false);
        expect(cypress.run).toHaveBeenCalledWith({ 
            config: { baseUrl },
            ...expectedCypressOptions,
        });
        expect(scheduleTargetAndForget).toHaveBeenCalled();
        expect(targetFromTargetString).toHaveBeenCalledWith(devServerTarget);
    });

    it('should not run cypress if run scheduleTargetAndForget failing in console mode', async () => {
        (scheduleTargetAndForget as any) = jest
            .fn()
            .mockReturnValue(
                of({ success: false })
            );

        const run = await architect.scheduleBuilder(
            '@ngchile/cypress-cucumber-schematics:cypress', 
            cypressOptions,
        );
        const output = await run.result;
        await run.stop();

        const { devServerTarget } = cypressOptions;
        expect(output.success).toBe(false);
        expect(cypress.run).not.toHaveBeenCalled();
        expect(cypress.open).not.toHaveBeenCalled();
        expect(scheduleTargetAndForget).toHaveBeenCalled();
        expect(targetFromTargetString).toHaveBeenCalledWith(devServerTarget);
    });

    it('should open cypress', async () => {
        (scheduleTargetAndForget as any) = jest
            .fn()
            .mockReturnValue(
                of({ success: true })
            );
        cypressOptions.mode = 'browser';
        cypress.open.mockReturnValue(Promise.resolve(0));

        const run = await architect.scheduleBuilder(
            '@ngchile/cypress-cucumber-schematics:cypress', 
            cypressOptions,
        );
        const output = await run.result;
        await run.stop();

        const {
            mode,
            baseUrl,
            devServerTarget,
            ...expectedCypressOptions
        } = cypressOptions;

        expect(output.success).toBe(true);
        expect(cypress.open).toHaveBeenCalledWith({ 
            config: { baseUrl },
            ...expectedCypressOptions,
        });
        expect(scheduleTargetAndForget).toHaveBeenCalled();
        expect(targetFromTargetString).toHaveBeenCalledWith(devServerTarget);
    });

    it('should open cypress even if run scheduleTargetAndForget failing in console mode', async () => {
        (scheduleTargetAndForget as any) = jest
            .fn()
            .mockReturnValue(
                of({ success: false })
            );
        const cypressNewOptions = {
            ...cypressOptions,
            browser: 'edge',
            ciBuildId: 'cypress-builder',
            configFile: 'e2e/cypress.json',
            mode: 'browser',
            parallel: true,
            record: true,
            group: 'group1',
            key: 'XXYYZZ',
            project: '/path/to/project',
            reporter: '/path/to/reporter',
            spec: 'features/admin.feature', 
        };
        cypress.open.mockReturnValue(Promise.resolve(0));

        const run = await architect.scheduleBuilder(
            '@ngchile/cypress-cucumber-schematics:cypress', 
            cypressNewOptions,
        );
        const output = await run.result;
        await run.stop();

        const {
            mode,
            baseUrl,
            devServerTarget,
            ...expectedCypressOptions
        } = cypressNewOptions;

        expect(output.success).toBe(true);
        expect(cypress.open).toHaveBeenCalledWith({ 
            config: { baseUrl },
            ...expectedCypressOptions,
        });
        expect(scheduleTargetAndForget).toHaveBeenCalled();
        expect(targetFromTargetString).toHaveBeenCalledWith(devServerTarget);
    });

    it('should catch error and set success to false if an error is throwed', async () => {
        (scheduleTargetAndForget as any) = jest
            .fn()
            .mockReturnValue(
                throwError(new Error())
            );

        const run = await architect.scheduleBuilder(
            '@ngchile/cypress-cucumber-schematics:cypress', 
            cypressOptions,
        );
        const output = await run.result;
        await run.stop();

        const { devServerTarget } = cypressOptions;
        expect(output.success).toBe(false);
        expect(cypress.run).not.toHaveBeenCalled();
        expect(cypress.open).not.toHaveBeenCalled();
        expect(scheduleTargetAndForget).toHaveBeenCalled();
        expect(targetFromTargetString).toHaveBeenCalledWith(devServerTarget);
    });

    it('should not run scheduleTargetAndForget when the devServerOption is not provided', async () => {
        const testsResult = { totalFailed: 0 };
        cypress.run.mockReturnValue(Promise.resolve(testsResult));
        (scheduleTargetAndForget as any) = jest.fn();

        const cypressNewOptions = {
            mode: 'console',
            baseUrl: 'http://localhost:80',
            env: {
                API_URL: 'http://localhost:8080/api/v1/users'
            }
        };

        const run = await architect.scheduleBuilder(
            '@ngchile/cypress-cucumber-schematics:cypress', 
            cypressNewOptions,
        );
        const output = await run.result;
        await run.stop();

        const {
            mode,
            baseUrl,
            ...expectedCypressOptions
        } = cypressNewOptions;

        expect(output.success).toBe(true);
        expect(cypress.run).toHaveBeenCalledWith({ 
            config: { baseUrl },
            ...expectedCypressOptions,
        });
        expect(scheduleTargetAndForget).not.toHaveBeenCalled();
    });
});
