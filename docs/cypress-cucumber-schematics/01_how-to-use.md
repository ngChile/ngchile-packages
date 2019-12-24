# How to use
`cypress-cucumber-schematics` is a schematic package for enabling [Cypress](https://www.cypress.io/) E2E testing using [Cucumber](https://cucumber.io/docs/cucumber/) with [Gherkins](https://cucumber.io/docs/gherkin/), providing a better way to develop apps in a [BDD](https://en.wikipedia.org/wiki/Behavior-driven_development) (Behavior Driven Development) way.

## Using in your application
You can use this schematic in every stage of your application: initial creation of a project or a production-ready Angular app. Simply just execute `ng add @ngChile/cypress-cucumber-schematics` in the folder of your project and you're done!

[![asciicast](https://asciinema.org/a/290098.svg)](https://asciinema.org/a/290098)

## What this schematic does?
* Installs Cypress as a development dependency.
* Installs `cypress-cucumber-preprocessor` as a development dependency. Learn more about this package [here](https://github.com/TheBrainFamily/cypress-cucumber-preprocessor).
* Removes Protractor in `angular.json` and adds `cypress-cucumber-preprocessor`.
* Configures `cypress-cucumber-preprocessor` in `package.json` file.
* Creates Cypress project scafolding in `e2e` folder.
* Creates `cypress.json` configuration file.