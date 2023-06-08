import {
  Module,
  customModule,
  ControlElement,
  customElements,
  Container,
  IDataSchema,
  HStack,
  Label,
  VStack,
  Styles,
  Panel,
  BarChart,
  moment
} from '@ijstech/components';
import { IBarChartConfig, callAPI, formatNumber, groupByCategory, extractUniqueTimes, concatUnique, groupArrayByKey, formatNumberByFormat, IBarChartOptions } from './global/index';
import { chartStyle, containerStyle } from './index.css';
import assets from './assets';
import configData from './data.json';
const Theme = Styles.Theme.ThemeVars;
const currentTheme = Styles.Theme.currentTheme;

const options = {
  type: 'object',
  properties: {
    xColumn: {
      type: 'object',
      title: 'X column',
      required: true,
      properties: {
        key: {
          type: 'string',
          required: true
        },
        type: {
          type: 'string',
          enum: ['time', 'category'],
          required: true
        }
      }
    },
    yColumns: {
      type: 'array',
      title: 'Y columns',
      required: true,
      items: {
        type: 'string'
      }
    },
    groupBy: {
      type: 'string'
    },
    stacking: {
      type: 'boolean'
    },
    legend: {
      type: 'object',
      title: 'Show Chart Legend',
      properties: {
        show: {
          type: 'boolean'
        },
        scroll: {
          type: 'boolean'
        },
        position: {
          type: 'string',
          enum: ['top', 'bottom', 'left', 'right']
        }
      }
    },
    showDataLabels: {
      type: 'boolean'
    },
    percentage: {
      type: 'boolean'
    },
    xAxis: {
      type: 'object',
      properties: {
        title: {
          type: 'string'
        },
        tickFormat: {
          type: 'string'
        },
        reverseValues: {
          type: 'boolean'
        }
      }
    },
    yAxis: {
      type: 'object',
      properties: {
        title: {
          type: 'string'
        },
        tickFormat: {
          type: 'string'
        },
        labelFormat: {
          type: 'string'
        },
        position: {
          type: 'string',
          enum: ['left', 'right']
        }
      }
    },
    seriesOptions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            required: true
          },
          title: {
            type: 'string'
          },
          color: {
            type: 'string',
            format: 'color'
          }
        }
      }
    }
  }
}
interface ScomBarChartElement extends ControlElement {
  data: IBarChartConfig
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['i-scom-bar-chart']: ScomBarChartElement;
    }
  }
}

@customModule
@customElements('i-scom-bar-chart')
export default class ScomBarChart extends Module {
  private chartContainer: VStack;
  private vStackInfo: HStack;
  private pnlChart: Panel;
  private loadingElm: Panel;
  private lbTitle: Label;
  private lbDescription: Label;
  private chartData: { [key: string]: string | number }[] = [];
  private apiEndpoint = '';

  private _data: IBarChartConfig = { apiEndpoint: '', title: '', options: undefined };
  tag: any = {};
  defaultEdit: boolean = true;
  readonly onConfirm: () => Promise<void>;
  readonly onDiscard: () => Promise<void>;
  readonly onEdit: () => Promise<void>;

  static async create(options?: ScomBarChartElement, parent?: Container) {
    let self = new this(parent, options);
    await self.ready();
    return self;
  }

  constructor(parent?: Container, options?: ScomBarChartElement) {
    super(parent, options);
  }

  private getData() {
    return this._data;
  }

  private async setData(data: IBarChartConfig) {
    this._data = data;
    this.updateChartData();
  }

  private getTag() {
    return this.tag;
  }

  private async setTag(value: any) {
    const newValue = value || {};
    for (let prop in newValue) {
      if (newValue.hasOwnProperty(prop)) {
        this.tag[prop] = newValue[prop];
      }
    }
    this.width = this.tag.width || 700;
    this.height = this.tag.height || 500;
    this.onUpdateBlock();
  }

  private getPropertiesSchema() {
    const propertiesSchema = {
      type: 'object',
      properties: {
        apiEndpoint: {
          type: 'string',
          title: 'API Endpoint',
          required: true
        },
        title: {
          type: 'string',
          required: true
        },
        description: {
          type: 'string'
        },
        options
      }
    }
    return propertiesSchema as any;
  }

  private getGeneralSchema() {
    const propertiesSchema = {
      type: 'object',
      required: ['apiEndpoint', 'title'],
      properties: {
        apiEndpoint: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        description: {
          type: 'string'
        }
      }
    }
    return propertiesSchema as IDataSchema;
  }

  private getAdvanceSchema() {
    const propertiesSchema = {
      type: 'object',
      properties: {
        options
      }
    };
    return propertiesSchema as any;
  }

  private getThemeSchema() {
    const themeSchema = {
      type: 'object',
      properties: {
        darkShadow: {
          type: 'boolean'
        },
        fontColor: {
          type: 'string',
          format: 'color'
        },
        backgroundColor: {
          type: 'string',
          format: 'color'
        },
        // width: {
        //   type: 'string'
        // },
        height: {
          type: 'string'
        }
      }
    }
    return themeSchema as IDataSchema;
  }

  private _getActions(propertiesSchema: IDataSchema, themeSchema: IDataSchema, advancedSchema?: IDataSchema) {
    const actions = [
      {
        name: 'Settings',
        icon: 'cog',
        command: (builder: any, userInputData: any) => {
          let _oldData: IBarChartConfig = { apiEndpoint: '', title: '', options: undefined };
          return {
            execute: async () => {
              _oldData = { ...this._data };
              if (userInputData) {
                if (advancedSchema) {
                  this._data = { ...this._data, ...userInputData };
                } else {
                  this._data = { ...userInputData };
                }
              }
              if (builder?.setData) builder.setData(this._data);
              this.setData(this._data);
            },
            undo: () => {
              if (advancedSchema) _oldData = { ..._oldData, options: this._data.options };
              if (builder?.setData) builder.setData(_oldData);
              this.setData(_oldData);
            },
            redo: () => { }
          }
        },
        userInputDataSchema: propertiesSchema,
        userInputUISchema: advancedSchema ? undefined : {
          type: 'VerticalLayout',
          elements: [
            {
              type: 'Control',
              scope: '#/properties/apiEndpoint',
              title: 'API Endpoint'
            },
            {
              type: 'Control',
              scope: '#/properties/title'
            },
            {
              type: 'Control',
              scope: '#/properties/description'
            },
            {
              type: 'Control',
              scope: '#/properties/options',
              options: {
                detail: {
                  type: 'VerticalLayout'
                }
              }
            }
          ]
        }
      },
      {
        name: 'Theme Settings',
        icon: 'palette',
        command: (builder: any, userInputData: any) => {
          let oldTag = {};
          return {
            execute: async () => {
              if (!userInputData) return;
              oldTag = JSON.parse(JSON.stringify(this.tag));
              if (builder?.setTag) builder.setTag(userInputData);
              else this.setTag(userInputData);
            },
            undo: () => {
              if (!userInputData) return;
              this.tag = JSON.parse(JSON.stringify(oldTag));
              if (builder?.setTag) builder.setTag(this.tag);
              else this.setTag(this.tag);
            },
            redo: () => { }
          }
        },
        userInputDataSchema: themeSchema
      }
    ]
    if (advancedSchema) {
      const advanced = {
        name: 'Advanced',
        icon: 'sliders-h',
        command: (builder: any, userInputData: any) => {
          let _oldData: IBarChartOptions = {};
          return {
            execute: async () => {
              _oldData = { ...this._data?.options };
              if (userInputData?.options !== undefined) this._data.options = userInputData.options;
              if (builder?.setData) builder.setData(this._data);
              this.setData(this._data);
            },
            undo: () => {
              this._data.options = { ..._oldData };
              if (builder?.setData) builder.setData(this._data);
              this.setData(this._data);
            },
            redo: () => { }
          }
        },
        userInputDataSchema: advancedSchema,
        userInputUISchema: {
          type: 'VerticalLayout',
          elements: [
            {
              type: 'Control',
              scope: '#/properties/options',
              options: {
                detail: {
                  type: 'VerticalLayout'
                }
              }
            }
          ]
        }
      }
      actions.push(advanced);
    }
    return actions
  }

  getConfigurators() {
    const self = this;
    return [
      {
        name: 'Builder Configurator',
        target: 'Builders',
        getActions: () => {
          return this._getActions(this.getGeneralSchema(), this.getThemeSchema(), this.getAdvanceSchema());
        },
        getData: this.getData.bind(this),
        setData: async (data: IBarChartConfig) => {
          const defaultData = configData.defaultBuilderData;
          await this.setData({ ...defaultData, ...data });
        },
        getTag: this.getTag.bind(this),
        setTag: this.setTag.bind(this)
      },
      {
        name: 'Emdedder Configurator',
        target: 'Embedders',
        getActions: () => {
          return this._getActions(this.getPropertiesSchema(), this.getThemeSchema())
        },
        getLinkParams: () => {
          const data = this._data || {};
          return {
            data: window.btoa(JSON.stringify(data))
          }
        },
        setLinkParams: async (params: any) => {
          if (params.data) {
            const utf8String = decodeURIComponent(params.data);
            const decodedString = window.atob(utf8String);
            const newData = JSON.parse(decodedString);
            let resultingData = {
              ...self._data,
              ...newData
            };
            await this.setData(resultingData);
          }
        },
        getData: this.getData.bind(this),
        setData: this.setData.bind(this),
        getTag: this.getTag.bind(this),
        setTag: this.setTag.bind(this)
      }
    ]
  }

  private updateStyle(name: string, value: any) {
    value ? this.style.setProperty(name, value) : this.style.removeProperty(name);
  }

  private updateTheme() {
    if (this.chartContainer) {
      this.chartContainer.style.boxShadow = this.tag?.darkShadow ? '0 -2px 10px rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.16) 0px 1px 4px';
    }
    this.updateStyle('--text-primary', this.tag?.fontColor);
    this.updateStyle('--background-main', this.tag?.backgroundColor);
  }

  private onUpdateBlock() {
    this.renderChart();
    this.updateTheme();
  }

  private async updateChartData() {
    if (this._data.apiEndpoint === this.apiEndpoint) {
      this.onUpdateBlock();
      return;
    }
    const apiEndpoint = this._data.apiEndpoint;
    this.apiEndpoint = apiEndpoint;
    if (apiEndpoint) {
      this.loadingElm.visible = true;
      const data = await callAPI(apiEndpoint);
      this.loadingElm.visible = false;
      if (data && this._data.apiEndpoint === apiEndpoint) {
        this.chartData = data;
        this.onUpdateBlock();
        return;
      }
    }
    this.chartData = [];
    this.onUpdateBlock();
  }

  private renderChart() {
    if ((!this.pnlChart && this._data.options) || !this._data.options) return;
    const { title, description, options } = this._data;
    this.lbTitle.caption = title;
    this.lbDescription.caption = description;
    this.lbDescription.visible = !!description;
    this.pnlChart.height = `calc(100% - ${this.vStackInfo.offsetHeight + 10}px)`;
    const { xColumn, yColumns, groupBy, seriesOptions, stacking, legend, showDataLabels, percentage, xAxis, yAxis } = options;
    const { key, type } = xColumn;
    let _legend = {
      show: legend?.show,
    }
    if (legend?.position) {
      _legend[legend.position] = 'auto';
      if (['left', 'right'].includes(legend.position)) {
        _legend['orient'] = 'vertical';
      }
    }
    if (legend?.scroll) {
      _legend['type'] = 'scroll';
    }
    let _series = [];
    let arr = this.chartData;
    const item = (arr && arr[0]) || {};
    if (groupBy && item[groupBy] !== undefined) {
      const group = groupByCategory(arr, groupBy, key, yColumns[0]);
      const times = extractUniqueTimes(arr, key);
      let groupData: { [key: string]: any[] } = {};
      const keys = Object.keys(group);
      keys.map(v => {
        const _data = concatUnique(times, group[v]);
        groupData[v] = groupArrayByKey(Object.keys(_data).map(m => [type === 'time' ? new Date(m) : m, _data[m]]));
      });
      const isPercentage = percentage && groupData[keys[0]] && typeof groupData[keys[0]][0][1] === 'number';
      _series = keys.map(v => {
        const seriesOpt = seriesOptions?.find(f => f.key === v);
        let _data = [];
        if (isPercentage) {
          _data = groupData[v].map((vals, idx) => {
            let total = 0;
            for (const k of keys) {
              total += groupData[k][idx][1];
            }
            return [vals[0], (vals[1] / total) * 100];
          });
        } else {
          _data = groupData[v];
        }
        return {
          name: seriesOpt?.title || v,
          type: 'bar',
          stack: stacking,
          itemStyle: seriesOpt?.color ? { color: seriesOpt.color } : undefined,
          emphasis: {
            focus: 'series'
          },
          showSymbol: false,
          label: showDataLabels ? {
            show: true,
            formatter: function (params: any) {
              return formatNumber(params.value);
            }
          } : undefined,
          data: _data
        }
      });
    } else {
      let groupData: { [key: string]: any[] } = {};
      let isPercentage = percentage && arr.length > 0;
      yColumns.map(col => {
        if (isPercentage && typeof arr[0][col] !== 'number') {
          isPercentage = false;
        }
        groupData[col] = groupArrayByKey(arr.map(v => [type === 'time' ? new Date(v[key]) : col, v[col]]));
      });
      _series = yColumns.map((col) => {
        let _data = [];
        const seriesOpt = seriesOptions?.find(f => f.key === col);
        if (isPercentage) {
          _data = groupData[col].map((vals, idx) => {
            let total = 0;
            for (const k of yColumns) {
              total += groupData[k][idx][1];
            }
            return [vals[0], (vals[1] / total) * 100];
          });
        } else {
          _data = groupData[col];
        }
        return {
          name: seriesOpt?.title || col,
          type: 'bar',
          stack: stacking,
          itemStyle: seriesOpt?.color ? { color: seriesOpt.color } : undefined,
          emphasis: {
            focus: 'series'
          },
          showSymbol: false,
          label: showDataLabels ? {
            show: true,
            formatter: function (params: any) {
              return formatNumber(params.value);
            }
          } : undefined,
          data: _data
        }
      });
    }
    let min = 0, max = 0;
    const isSingle = _series.length === 1;
    if (isSingle) {
      const arr = _series[0].data.filter(v => v[1] !== null).map(v => v[1]);
      min = Math.min(...arr);
      max = Math.max(...arr);
      const step = (max - min) / 5;
      min = min > step ? min - step : min;
      max += step;
    }
    const minInterval = (max - min) / 4;
    const power = Math.pow(10, Math.floor(Math.log10(minInterval)));
    const roundedInterval = Math.ceil(minInterval / power) * power;
    const _chartData: any = {
      tooltip: {
        trigger: 'axis',
        position: function (point: any, params: any, dom: any, rect: any, size: any) {
          var x = point[0];
          var y = point[1];
          var viewWidth = document.documentElement.clientWidth;
          var viewHeight = document.documentElement.clientHeight;
          var boxWidth = size.contentSize[0];
          var boxHeight = size.contentSize[1];
          // calculate x position of tooltip
          if (x + boxWidth > viewWidth) {
            x = x - boxWidth;
          }
          // calculate y position of tooltip
          if (y + boxHeight > viewHeight) {
            y = y - boxHeight;
          }
          if (x < 0) x = 0;
          if (y < 0) y = 0;
          return [x, y];
        },
        formatter: (params: any) => {
          let res = `<b>${xColumn.type === 'time' ? moment(params[0].axisValue).format('YYYY-MM-DD HH:mm') : params[0].axisValue}</b>`;
          if (_series.length === 1) {
            res += `<div style="display: flex; justify-content: space-between; gap: 10px"><span>${params[0].marker} ${params[0].seriesName}</span> ${params[0].value[1] === null ? '-' : percentage ? formatNumber(params[0].value[1], { percentValues: true }) : formatNumberByFormat(params[0].value[1], yAxis?.labelFormat ? yAxis.labelFormat : undefined)}</div>`;
          } else {
            for (const param of params) {
              if (param.value[1] !== null) {
                res += `<div style="display: flex; justify-content: space-between; gap: 10px"><span>${param.marker} ${param.seriesName}</span> ${percentage ? formatNumber(param.value[1], { percentValues: true }) : formatNumberByFormat(param.value[1], yAxis?.labelFormat ? yAxis.labelFormat : undefined)}</div>`;
              }
            }
          }
          return res;
        },
        axisPointer: {
          type: 'cross',
          label: {
            show: false
          }
        }
      },
      legend: _legend,
      xAxis: {
        type: type,
        boundaryGap: false,
        inverse: xAxis?.reverseValues,
        name: xAxis?.title || '',
        nameLocation: 'center',
        nameGap: xAxis?.title ? 25 : 15,
        nameTextStyle: {
          fontWeight: 'bold'
        },
        axisLabel: {
          fontSize: 10,
          hideOverlap: true,
          formatter: xAxis?.tickFormat ? (value: number, index: number) => {
            if (type === 'time') {
              return moment(value).format(xAxis.tickFormat)
            } else {
              if (isNaN(value)) return value;
              return formatNumber(value, { format: xAxis.tickFormat, decimals: 2 })
            }
          } : undefined
        }
      },
      yAxis: {
        type: 'value',
        name: yAxis?.title || '',
        nameLocation: 'center',
        nameGap: yAxis?.title ? 40 : 15,
        nameTextStyle: {
          fontWeight: 'bold'
        },
        position: yAxis?.position || 'left',
        min: isSingle ? min : undefined,
        max: isSingle ? max : undefined,
        interval: isSingle ? roundedInterval : undefined,
        axisLabel: {
          showMinLabel: false,
          showMaxLabel: false,
          fontSize: 10,
          position: 'end',
          formatter: (value: number, index: number) => {
            return formatNumber(value, { format: yAxis?.tickFormat, decimals: 2, percentValues: percentage })
          }
        },
        splitNumber: 4
      },
      series: _series
    };
    this.pnlChart.clearInnerHTML();
    const chart = new BarChart(this.pnlChart, {
      data: _chartData,
      width: '100%',
      height: '100%'
    });
    chart.data = _chartData;
    chart.drawChart();
  }

  private resizeChart() {
    if (this.pnlChart) {
      (this.pnlChart.firstChild as BarChart)?.resize();
    }
  }

  async init() {
    this.isReadyCallbackQueued = true;
    this.updateTheme();
    super.init();
    this.setTag({
      fontColor: currentTheme.text.primary,
      backgroundColor: currentTheme.background.main,
      darkShadow: false,
      height: 500
    })
    this.classList.add(chartStyle);
    // const { width, height, darkShadow } = this.tag || {};
    // this.width = width || 700;
    // this.height = height || 500;
    this.maxWidth = '100%';
    this.chartContainer.style.boxShadow = 'rgba(0, 0, 0, 0.16) 0px 1px 4px';
    const data = this.getAttribute('data', true);
    if (data) {
      this.setData(data);
    }
    this.isReadyCallbackQueued = false;
    this.executeReadyCallback();
    window.addEventListener('resize', () => {
      setTimeout(() => {
        this.resizeChart();
      }, 300);
    });
  }

  render() {
    return (
      <i-vstack
        id="chartContainer"
        position="relative"
        background={{ color: Theme.background.main }}
        height="100%"
        padding={{ top: 10, bottom: 10, left: 10, right: 10 }}
        class={containerStyle}
      >
        <i-vstack id="loadingElm" class="i-loading-overlay">
          <i-vstack class="i-loading-spinner" horizontalAlignment="center" verticalAlignment="center">
            <i-icon
              class="i-loading-spinner_icon"
              image={{ url: assets.fullPath('img/loading.svg'), width: 36, height: 36 }}
            />
          </i-vstack>
        </i-vstack>
        <i-vstack
          id="vStackInfo"
          width="100%"
          maxWidth="100%"
          margin={{ left: 'auto', right: 'auto', bottom: 10 }}
          verticalAlignment="center"
        >
          <i-label id="lbTitle" font={{ bold: true, color: Theme.text.primary }} />
          <i-label id="lbDescription" margin={{ top: 5 }} font={{ color: Theme.text.primary }} />
        </i-vstack>
        <i-panel id="pnlChart" width="100%" height="inherit" />
      </i-vstack>
    )
  }
}