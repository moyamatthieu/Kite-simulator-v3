# GEMINI.md
# PARLE EN FRANCAIS
## Project Overview

This is a 3D parametric modeling tool, similar to OpenSCAD or JSCAD, built with TypeScript and Three.js. The project has two main functionalities, each with its own HTML entry point:

1.  **Parametric CAD Tool (`index.html`):** A web-based editor for creating 3D objects using a parametric approach. The objects are defined in code and can be customized with parameters. The tool is designed to be compatible with the Godot Engine, allowing for exporting models in `.tscn` format.

2.  **Kite Simulator (`simulation.html`):** A realistic physics simulation of a stunt kite, also built with Three.js. This part of the project showcases more advanced physics and user interaction.

The project is structured with a clear separation of concerns, with dedicated modules for the core logic, rendering, object definitions, and exporters. It uses Vite for the build process and development server.

## Building and Running

To get the project running locally, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start a development server, and you can access the application at `http://localhost:3000`.

3.  **Build for production:**
    ```bash
    npm run build
    ```
    This will create a `dist` directory with the optimized production build.

4.  **Type checking:**
    ```bash
    npx tsc --noEmit
    ```
    This command checks for TypeScript errors without generating JavaScript files.

## Development Conventions

*   **Language:** The project is written in TypeScript.
*   **Modularity:** The codebase is organized into modules using ES module syntax. Path aliases (e.g., `@core`, `@objects`) are configured in `tsconfig.json` and `vite.config.ts` for cleaner imports.
*   **Creating New Objects:** To create a new 3D object, you can create a new TypeScript class that extends `StructuredObject` and implements the `ICreatable` interface. The `README.md` file provides a detailed guide on how to create and register new objects.
*   **Godot Compatibility:** A key feature of this project is its compatibility with the Godot Engine. The `Node3D` class provides a Godot-like abstraction layer, and there's a `GodotExporter` to convert the 3D objects into Godot's `.tscn` scene format.
*   **Code Style:** The code follows standard TypeScript and Prettier formatting conventions.
