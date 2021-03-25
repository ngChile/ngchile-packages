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
import { getWorkspace } from '@schematics/angular/utility/workspace';
import { addPackageJsonDependency, NodeDependency, NodeDependencyType } from '@schematics/angular/utility/dependencies';
import { join, normalize } from 'path';

import { getLatestNodeVersion, NpmRegistryPackage } from './utils/npmjs';

const { version } = require('../../../package.json');

export default function (options: any): Rule {
    return async (tree: Tree, context: SchematicContext) => {
        context.logger.info(`Running Cypress Cucumber schematics version ${version}`)
        const workspace = await getWorkspace(tree);

        return chain([
            removeProtractorFiles(workspace),
            addCypressCucumberDependencies(),
            addCypressCucumberBoilerplate(workspace),
            addCypressBuilder(workspace),
            addCypressCucumberCosmiconfig(),
        ]);
    };
}

function removeProtractorFiles(workspace): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const projectName = workspace.extensions.defaultProject;

        context.logger.debug('Clean protractor files if exists');

        const targetFolder = join(
            normalize(workspace.projects.get(projectName).root),
            '/e2e'
        );

        tree.getDir(targetFolder).visit(file => {
            tree.delete(file);
        });
        return tree;
    };
}

function addCypressCucumberDependencies(): Rule {
    return async (tree: Tree, context: SchematicContext) => {
        try {
            const dependencies = [
                'cypress-cucumber-preprocessor',
                '@cypress/webpack-preprocessor',
                'ts-loader',
            ];
            const promises = dependencies.map((dependencyName) =>
                getLatestNodeVersion(dependencyName)
                    .then((npmRegistryPackage: NpmRegistryPackage) => {
                        const nodeDependency: NodeDependency = {
                            type: NodeDependencyType.Dev,
                            name: npmRegistryPackage.name,
                            version: npmRegistryPackage.version,
                            overwrite: false
                        };
                        addPackageJsonDependency(tree, nodeDependency);
                        context.logger.info(`✅️  Added ${npmRegistryPackage.name} dependency`);
                    })
            );
    
            await Promise.all(promises);
    
            context.addTask(new NodePackageInstallTask());
            context.logger.info('✅️ All dependencies installed');
        } catch (error) {
            context.logger.error(`❌ Error in dependencies installed: ${error}`);
        }
    };
}

function addCypressCucumberBoilerplate(workspace): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const projectName = workspace.extensions.defaultProject;
        const sourceFolder = './files';
        const targetFolder = join(
            normalize(workspace.projects.get(projectName).root),
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

function addCypressBuilder(workspace): Rule {
    return (tree: Tree, context: SchematicContext) => {
        const projectName = workspace.extensions.defaultProject;
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
        const angularJson = JSON.parse(tree.read('./angular.json').toString('utf-8'));

        angularJson['projects'][projectName]['architect']['e2e'] = cypressOpenJson;

        tree.overwrite(
            './angular.json',
            JSON.stringify(angularJson, null, 2)
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
