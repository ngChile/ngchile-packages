import {
    Rule,
    SchematicContext,
    Tree,
    apply,
    chain,
    mergeWith,
    move,
    url,
    MergeStrategy,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { getWorkspace } from '@schematics/angular/utility/config';
import { addPackageJsonDependency, NodeDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';

import { join, normalize } from 'path';
import { Observable, of } from 'rxjs';

import { getLatestNodeVersion, NpmRegistryPackage } from './utils/npmjs';
import { concatMap, map, tap } from 'rxjs/operators';

const { version } = require('../../../package.json');

export default function (options: any): Rule {
    return (tree: Tree, context: SchematicContext) => {
        context.logger.info(`Running Cypress Cucumber schematics version ${version}`)
        return chain([
            removeProtractorFiles(),
            addCypressCucumberDependencies(),
            addCypressCucumberBoilerplate(),
            addCypressBuilder(),
            addCypressCucumberCosmiconfig(),
        ])(tree, context);
    };
}

function removeProtractorFiles(): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const workspace = getWorkspace(tree);
        const projectName = Object.keys(workspace['projects'])[0];

        context.logger.debug('Clean protractor files if exists');

        const targetFolder = join(
            normalize(workspace['projects'][projectName]['root']),
            '/e2e'
        );

        tree.getDir(targetFolder).visit(file => {
            tree.delete(file);
        });
        return tree;
    };
}

function addCypressCucumberDependencies(): Rule {
    return (tree: Tree, context: SchematicContext): Observable<Tree> => {
        return of(
            'cypress-cucumber-preprocessor',
            '@cypress/webpack-preprocessor',
            'ts-loader'
        ).pipe(
            concatMap(name => getLatestNodeVersion(name)),
            map((npmRegistryPackage: NpmRegistryPackage) => {
              const nodeDependency: NodeDependency = {
                type: NodeDependencyType.Dev,
                name: npmRegistryPackage.name,
                version: npmRegistryPackage.version,
                overwrite: false
              };
              addPackageJsonDependency(tree, nodeDependency);
              context.logger.info(`✅️  Added ${npmRegistryPackage.name} dependency`);
              return tree;
            }),
            tap(() => {
                context.addTask(new NodePackageInstallTask());
                context.logger.debug('✅️ All dependencies installed');
            })
        );
    };
}

function addCypressCucumberBoilerplate(): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const workspace = getWorkspace(tree);
        const projectName = Object.keys(workspace['projects'])[0];
        const sourceFolder = './files';
        const targetFolder = join(
            normalize(workspace['projects'][projectName]['root']),
        );

        context.logger.debug('Adding Cypress and Cucumber files');

        const rules = [
            move(targetFolder),
        ];
        const sourceUrl = url(sourceFolder);
        const rule = chain([
            mergeWith(apply(sourceUrl, rules), MergeStrategy.Overwrite),
        ]);
        return rule(tree, context);
    }
}

function addCypressBuilder(): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const workspace = getWorkspace(tree);
        const projectName = Object.keys(workspace['projects'])[0];
        const projectArchitectJson = workspace['projects'][projectName]['architect'];
        const cypressOpenJson = {
            builder: '@ngchile/cypress-cucumber-schematics:cypress',
            options: {
                devServerTarget: `${projectName}:serve`,
                mode: 'browser'
            },
            configurations: {
                production: {
                    devServerTarget: `${projectName}:serve:production`
                }
            }
        };

        projectArchitectJson['e2e'] = cypressOpenJson as any;

        tree.overwrite(
            './angular.json',
            JSON.stringify(workspace, null, 2)
        );
        return tree;
    };
}

function addCypressCucumberCosmiconfig(): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const packageJson = JSON.parse(
            tree.read('./package.json').toString('utf-8')
        );
        packageJson['cypress-cucumber-preprocessor'] = {
            'step_definitions': './e2e/step_definitions'
        };
        packageJson['scripts']['e2e:ci'] = 'ng e2e --mode console';

        tree.overwrite(
            './package.json',
            JSON.stringify(packageJson, null, 2)
        );
        return tree
    };
}
