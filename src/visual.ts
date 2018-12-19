/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/

"use strict";
import { select } from "d3-selection";
import { formatPrefix } from "d3-format";

import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import IViewport = powerbi.IViewport;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import { VisualSettings } from "./settings";
import { VisualViewModel, CategoryViewModel } from "./visualViewModel";
import { visualTransform } from "./visualTransform";

import DataViewMatrix = powerbi.DataViewMatrix;
import DataViewMatrixNode = powerbi.DataViewMatrixNode;

"use strict";
export class Visual implements IVisual {
    private target: d3.Selection<any, any, any, any>;
    private table: d3.Selection<any, any, any, any>;
    private tHead: d3.Selection<any, any, any, any>;
    private tBody: d3.Selection<any, any, any, any>;
    private settings: VisualSettings;

    constructor(options: VisualConstructorOptions) {
        let target: d3.Selection<any, any, any, any> = this.target = select(options.element);

    }

    public update(options: VisualUpdateOptions): void {
        this.updateInternal(options, visualTransform(options.dataViews));
    }

    public updateInternal(options: VisualUpdateOptions, viewModel: VisualViewModel): void {
        let matrix: DataViewMatrix = options.dataViews[0].matrix;
        if (!viewModel || !matrix) {
            return;
        }
        this.settings = Visual.parseSettings(options.dataViews[0]);
        let root: DataViewMatrixNode = matrix.rows.root;

        // create root node
        this.target.select(".root").remove();
        let rootElement = this.target.selectAll("div.root");
        let rootElementData = rootElement.data([root]);
        rootElementData.exit().remove();

        let rootElementMerged = rootElementData.enter().append("div").merge(rootElement);
        rootElementMerged.classed("root", true);

        let treeWalker = function(parent, data) {
            let childrenElements = parent.selectAll("div.child");
            let childrenElementsData = childrenElements.data(data);
            childrenElementsData.exit().remove();
            let childrenElementsMerged = childrenElementsData
                .enter()
                .append("div")
                .merge(childrenElements);
            childrenElementsMerged.classed("child", true);
            childrenElementsMerged.style("margin-left", data => `${data.level * 20}px`);
            childrenElementsMerged.append("text").text(data => data.value);
            childrenElementsMerged.nodes().forEach((node, index) => {
                if (data[index].children) {
                    // draw child
                    treeWalker(select(node), data[index].children);
                }
                else {
                    // draw values
                    let valuesElementsData = select(node).selectAll("text.values").data(Object.values(data[index].values));

                    select(node)
                        .append("text")
                        .classed("values", true)
                        .text(" Measures: ");

                    valuesElementsData
                        .enter()
                        .append("text")
                        .classed("values", true)
                        .text( data => ` ${(<any>data).value} |`);

                }
            });
        };

        treeWalker(this.target.select("div.root"), root.children);
    }

    private static parseSettings(dataView: DataView): VisualSettings {
        return VisualSettings.parse(dataView) as VisualSettings;
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions):
        VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}