# How to use
`cypress-cucumber-schematics` is a schematic package for enabling [Cypress](https://www.cypress.io/) E2E testing using [Cucumber](https://cucumber.io/docs/cucumber/) with [Gherkins](https://cucumber.io/docs/gherkin/), providing a better way to develop apps in a BDD (Behavior Driven Development) way.

## Using in your application
You can use this schematic in every stage of your application: initial creation of a project or a production-ready Angular app. Simply just execute `ng add @ngChile/cypress-cucumber-schematics` in the folder of your project and you're done!

## What this schematic does?
* Installs Cypress as a development dependency.
* Installs `cypress-cucumber-preprocessor` as a development dependency.
* Removes Protractor in `angular.json` and adds `cypress-cucumber-preprocessor`.
* Configures `cypress-cucumber-preprocessor` in `package.json` file.
* Creates Cypress project scafolding in `e2e` folder.
* Creates `cypress.json` configuration file.