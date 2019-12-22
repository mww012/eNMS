import {
  adjustHeight,
  serializeForm,
  userIsActive,
  createTooltips,
} from "./base.js";

let table = (window.eNMS.table = {});
export let tables = {};
export const models = {};

export function initTable(type, instance, runtime, id) {
  // eslint-disable-next-line new-cap
  tables[type] = $(id ? `#table-${id}` : "#table").DataTable({
    serverSide: true,
    orderCellsTop: true,
    autoWidth: false,
    scrollX: true,
    drawCallback: function() {
      $(".paginate_button > a").on("focus", function() {
        $(this).blur();
      });
      createTooltips();
      adjustHeight();
    },
    sDom: "<'top'i>rt<'bottom'lp><'clear'>",
    columns: models[type].columns,
    columnDefs: [{ className: "dt-center", targets: "_all" }],
    initComplete: function() {
      this.api()
        .columns()
        .every(function(index) {
          const data = models[type].columns[index];
          let element;
          if (data.search == "text") {
            element = `
              <input
                id="${type}_filtering-${data.data}"
                name="${data.data}"
                type="text"
                placeholder="&#xF002;"
                class="form-control"
                style="font-family:Arial, FontAwesome; width: 100%; height: 30px; margin-top: 5px"
              >`;
          } else if (data.search == "bool") {
            element = `
              <select
                id="${type}_filtering-${data.data}"
                name="${data.data}"
                class="form-control"
                style="width: 100%; height: 30px; margin-top: 5px"
              >
                <option value="">Any</option>
                <option value="bool-true">True</option>
                <option value="bool-false">False</option>
              </select>`;
          } else if (data.data == "buttons") {
            element = models[type].controls.join("");
          }
          $(element)
            .appendTo($(this.header()))
            .on("keyup change", function() {
              tables[type].ajax.reload(null, false);
            })
            .on("click", function(e) {
              e.stopPropagation();
            });
        });
      this.api().columns.adjust();
      adjustHeight();
    },
    ajax: {
      url: `/table_filtering/${type}`,
      type: "POST",
      contentType: "application/json",
      data: (d) => {
        const form = $(`#${type}_filtering`).length
          ? `#${type}_filtering-form`
          : `#search-${type}-form`;
        d.form = serializeForm(form);
        d.instance = instance;
        if (runtime) {
          d.runtime = $(`#runtimes-${instance.id}`).val() || runtime;
        }
        return JSON.stringify(d);
      },
      dataSrc: function(result) {
        return result.data.map((instance) => new models[type](instance));
      },
    },
  });
  if (["changelog", "run", "result"].includes(type)) {
    tables[type].order([0, "desc"]).draw();
  }
  if (type == "service") {
    $("#parent-filtering").on("change", function() {
      tables["service"].ajax.reload(null, false);
    });
  }
  if (["run", "service", "task", "workflow"].includes(type)) {
    table.refreshTablePeriodically(type, 3000);
  }
}

table.filterTable = function(formType) {
  tables[formType].ajax.reload(null, false);
  alertify.notify("Filter applied.", "success", 5);
};

table.refreshTable = function(tableType, displayNotification) {
  tables[tableType].ajax.reload(null, false);
  if (displayNotification) alertify.notify("Table refreshed.", "success", 5);
};

table.refreshTablePeriodically = function(tableType, interval) {
  if (userIsActive) table.refreshTable(tableType, false);
  setTimeout(
    () => table.refreshTablePeriodically(tableType, interval),
    interval
  );
};

class Base {
  constructor(properties) {
    Object.assign(this, properties);
    this.instance = JSON.stringify({
      id: this.id,
      name: this.name,
      type: this.type,
    }).replace(/"/g, "'");
  }

  static createNewButton(type) {
    return `
      <button
        class="btn btn-sm btn-primary"
        onclick="eNMS.base.showTypePanel('${type}')"
        data-tooltip="New"
        type="button"
      >
        <span class="glyphicon glyphicon-plus"></span>
      </button>`;
  }

  static searchTableButton(type) {
    return `
      <button
        class="btn btn-sm btn-info btn-file"
        onclick="eNMS.base.showPanel('${type}_filtering')"
        data-tooltip="Advanced Search"
        type="button"
      >
        <span class="glyphicon glyphicon-search"></span>
      </button>`;
  }

  static refreshTableButton(type) {
    return `
      <button
        class="btn btn-sm btn-info btn-file"
        onclick="eNMS.table.refreshTable('${type}', true)"
        data-tooltip="Refresh"
        type="button"
      >
        <span class="glyphicon glyphicon-refresh"></span>
      </button>`;
  }

  get deleteInstanceButton() {
    return `
      <li>
        <button type="button" class="btn btn-sm btn-danger"
        onclick="eNMS.base.showDeletionPanel(${
          this.instance
        })" data-tooltip="Delete"
          ><span class="glyphicon glyphicon-trash"></span
        ></button>
      </li>`;
  }
}

models.device = class Device extends Base {
  static get columns() {
    return [
      { data: "name", title: "Name", search: "text" },
      { data: "description", title: "Description", search: "text" },
      { data: "subtype", title: "Subtype", search: "text" },
      { data: "model", title: "Model", search: "text" },
      { data: "location", title: "Location", search: "text" },
      { data: "vendor", title: "Vendor", search: "text" },
      { data: "operating_system", title: "Operating System", search: "text" },
      { data: "os_version", title: "OS Version", search: "text" },
      { data: "ip_address", title: "IP Address", search: "text" },
      { data: "port", title: "Port", search: "text" },
      { data: "buttons" },
    ];
  }

  static get controls() {
    return [
      super.createNewButton("device"),
      super.searchTableButton("device"),
      super.refreshTableButton("device"),
    ];
  }

  get buttons() {
    return `
      <ul class="pagination pagination-lg" style="margin: 0px; width: 230px">
        <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick='eNMS.inventory.showDeviceNetworkData(${this.instance})'
          data-tooltip="Network Data"
            ><span class="glyphicon glyphicon-cog"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick="showDeviceResultsPanel(${this.instance})"
          data-tooltip="Results"
            ><span class="glyphicon glyphicon-list-alt"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-success"
          onclick="eNMS.base.showPanel('device_connection', '${this.id}')"
          data-tooltip="Connection"
            ><span class="glyphicon glyphicon-console"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('device', '${
            this.id
          }')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('device', '${this.id}', 'duplicate')"
          data-tooltip="Duplicate"
            ><span class="glyphicon glyphicon-duplicate"></span
          ></button>
        </li>
        ${this.deleteInstanceButton}
      </ul>`;
  }
};

models.link = class Link extends Base {
  static get columns() {
    return [
      { data: "name", title: "Name", search: "text" },
      { data: "description", title: "Description", search: "text" },
      { data: "subtype", title: "Subtype", search: "text" },
      { data: "model", title: "Model", search: "text" },
      { data: "location", title: "Location", search: "text" },
      { data: "vendor", title: "Vendor", search: "text" },
      { data: "source_name", title: "Source", search: "text" },
      { data: "destination_name", title: "Destination", search: "text" },
      { data: "buttons" },
    ];
  }

  static get controls() {
    return [
      super.createNewButton("link"),
      super.searchTableButton("link"),
      super.refreshTableButton("link"),
    ];
  }

  get buttons() {
    return `
      <ul class="pagination pagination-lg" style="margin: 0px; width: 120px">
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('link', '${
            this.id
          }')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('link', '${this.id}', 'duplicate')"
          data-tooltip="Duplicate"
            ><span class="glyphicon glyphicon-duplicate"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-danger"
          onclick='eNMS.base.showDeletionPanel(${
            this.instance
          })' data-tooltip="Delete"
            ><span class="glyphicon glyphicon-trash"></span
          ></button>
        </li>
      </ul>`;
  }
};

models.pool = class Pool extends Base {
  static get columns() {
    return [
      { data: "name", title: "Name", search: "text" },
      { data: "last_modified", title: "Last modified", search: "text" },
      { data: "description", title: "Description", search: "text" },
      { data: "never_update", title: "Never update", search: "bool" },
      { data: "longitude", title: "Longitude", search: "text" },
      { data: "latitude", title: "Latitude", search: "text" },
      { data: "object_number", title: "Object Count" },
      { data: "buttons" },
    ];
  }

  get object_number() {
    return `${this.device_number} devices - ${this.link_number} links`;
  }

  static get controls() {
    return [
      super.createNewButton("pool"),
      super.searchTableButton("pool"),
      super.refreshTableButton("pool"),
      `<button
        class="btn btn-primary btn-file"
        onclick="eNMS.updatePools()"
        data-tooltip="Update all pools"
        type="button"
      >
        <span class="glyphicon glyphicon-flash"></span>
      </button>`,
    ];
  }

  get buttons() {
    return `
      <ul class="pagination pagination-lg" style="margin: 0px; width: 230px">
        <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick="eNMS.visualization.showPoolView('${this.id}')"
          data-tooltip="Internal View"><span class="glyphicon glyphicon-eye-open">
          </span></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.inventory.showPoolObjectsPanel('${
            this.id
          }')" data-tooltip="Pool Objects"
            ><span class="glyphicon glyphicon-wrench"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="updatePools('${this.id}')" data-tooltip="Update"
            ><span class="glyphicon glyphicon-refresh"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('pool', '${
            this.id
          }')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('pool', '${this.id}', 'duplicate')"
          data-tooltip="Duplicate"
            ><span class="glyphicon glyphicon-duplicate"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-danger"
          onclick="eNMS.base.showDeletionPanel(${
            this.instance
          })" data-tooltip="Delete"
            ><span class="glyphicon glyphicon-trash"></span
          ></button>
        </li>
      </ul>
    `;
  }
};

models.service = class Service extends Base {
  static get columns() {
    return [
      {
        data: "name",
        title: "Name",
        width: "20%",
        search: "text",
        render: function(data, type, row, meta) {
          return `<b><a href="#" onclick="eNMS.automation.switchToWorkflow('${
            row.id
          }')">${row.scoped_name}</a></b>`;
        },
      },
      { data: "last_modified", title: "Last modified", search: "text" },
      { data: "type", title: "Type", search: "text" },
      { data: "description", title: "Description", search: "text" },
      { data: "vendor", title: "Vendor", search: "text" },
      { data: "operating_system", title: "Operating System", search: "text" },
      { data: "creator", title: "Creator", search: "text" },
      { data: "status", title: "Status", search: "text" },
      { data: "buttons" },
    ];
  }

  static get controls() {
    return [
      `
      <button
        class="btn btn-primary"
        onclick="eNMS.openServicePanel()"
        data-tooltip="New"
        type="button"
      >
        <span class="glyphicon glyphicon-plus"></span>
      </button>
      <button
        class="btn btn-info btn-file"
        onclick="eNMS.base.showPanel('service_filtering')"
        data-tooltip="Advanced Search"
        type="button"
      >
        <span class="glyphicon glyphicon-search"></span>
      </button>
      <button
        class="btn btn-info btn-file"
        onclick="eNMS.table.refreshTable('service', true)"
        data-tooltip="Refresh"
        type="button"
      >
        <span class="glyphicon glyphicon-refresh"></span>
      </button>
      <a
      id="left-arrow"
      class="btn btn-info btn-file"
      onclick="action['Backward']()"
      type="button"
    >
      <span class="glyphicon glyphicon-chevron-left"></span>
    </a>
    <a
      id="right-arrow"
      class="btn btn-info btn-file"
      onclick="action['Forward']()"
      type="button"
    >
      <span class="glyphicon glyphicon-chevron-right"></span>
    </a>
    <div class="pull-right">
      <select
        id="parent-filtering"
        name="parent-filtering"
        class="form-control"
      >
        <option value="true">Display services hierarchically</option>
        <option value="false">Display all services</option>
      </select>
    </div>
    <input type="hidden" id="workflow-filtering" name="workflow-filtering">
      `,
    ];
  }

  get status() {
    return "Idle";
  }

  get buttons() {
    return `
      <ul class="pagination pagination-lg" style="margin: 0px; width: 270px">
        <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick="eNMS.automation.showRuntimePanel('results', ${
            this.instance
          })"
          data-tooltip="Results"><span class="glyphicon glyphicon-list-alt"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick="eNMS.automation.showRuntimePanel('logs', ${this.instance})"
          data-tooltip="Logs"><span class="glyphicon glyphicon-list"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-success"
          onclick="eNMS.automation.normalRun('${this.id}')" data-tooltip="Run"
            ><span class="glyphicon glyphicon-play"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-success"
          onclick="eNMS.base.showTypePanel('{self.type}', '${this.id}', 'run')"
          data-tooltip="Parameterized Run"
            ><span class="glyphicon glyphicon-play-circle"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('{self.type}', '${
            this.id
          }')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="exportService('${this.id}')" data-tooltip="Export"
            ><span class="glyphicon glyphicon-download"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-danger"
          onclick="eNMS.base.showDeletionPanel(${
            this.instance
          })" data-tooltip="Delete"
            ><span class="glyphicon glyphicon-trash"></span
          ></button>
        </li>
      </ul>
    `;
  }
};

models.run = class Run extends Base {
  static get columns() {
    return [
      { data: "runtime", title: "Runtime", search: "text" },
      { data: "duration", title: "Duration", search: "text" },
      { data: "workflow_name", title: "Workflow", search: "text" },
      { data: "service_name", title: "Service", search: "text" },
      { data: "status", title: "Status", search: "text" },
      { data: "progress", title: "Progress", search: "text" },
      { data: "buttons" },
    ];
  }

  get progress() {
    return `progress`;
  }

  static get controls() {
    return [
      `<button
        class="btn btn-sm btn-info btn-file"
        onclick="eNMS.automation.displayCalendar('run')"
        data-tooltip="Calendar"
        type="button"
      >
        <span class="glyphicon glyphicon-calendar"></span>
      </button>`,
    ];
  }

  get buttons() {
    return [
      `<ul class="pagination pagination-lg" style="margin: 0px; width: 100px">
        <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick="eNMS.automation.showRuntimePanel('logs', {self.service.row_properties},
          '${this.runtime}')"data-tooltip="Logs">
          <span class="glyphicon glyphicon-list"></span></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick="eNMS.automation.showRuntimePanel('results', {self.service.row_properties},
          '${this.runtime}')"data-tooltip="Results">
          <span class="glyphicon glyphicon-list-alt"></span></button>
        </li>
      </ul>`,
    ];
  }
};

models.result = class Result extends Base {
  constructor(properties) {
    delete properties.result;
    super(properties);
  }

  static get columns() {
    return [
      { data: "runtime", title: "Runtime", search: "text" },
      { data: "duration", title: "Duration", search: "text" },
      { data: "workflow_name", title: "Workflow", search: "text" },
      { data: "service_name", title: "Service", search: "text" },
      { data: "device_name", title: "Device", search: "text" },
      {
        data: "success",
        title: "Success",
        render: function(data, type, row, meta) {
          const btn = row.success ? "success" : "danger";
          const label = row.success ? "Success" : "Failure";
          return `
            <button
              type="button"
              class="btn btn-${btn} btn-sm"
              style="width:100%">${label}
            </button>`;
        },
        search: "text",
        width: "80px",
      },
      { data: "buttons" },
      {
        data: "version_1",
        title: "V1",
        render: function(data, type, row, meta) {
          return `<input type="radio" name="v1" value="${this.id}">`;
        },
      },
      {
        data: "version_2",
        title: "V2",
        render: function(data, type, row, meta) {
          return `<input type="radio" name="v2" value="${this.id}">`;
        },
      },
    ];
  }

  static get controls() {
    return [
      `<button
        class="btn btn-info btn-file"
        onclick="eNMS.compare('result')"
        data-tooltip="Compare"
        type="button"
      >
        <span class="glyphicon glyphicon-adjust"></span>
      </button>`,
    ];
  }

  get buttons() {
    return [
      `
    <ul class="pagination pagination-lg" style="margin: 0px; width: 90px">
      <li>
          <button type="button" class="btn btn-sm btn-info"
          onclick="eNMS.automation.showResult('${this.id}')"
          data-tooltip="Results"><span class="glyphicon glyphicon-list-alt">
          </span></button>
      </li>
      <li>
          <button type="button" id="btn-result-${
            this.id
          }" class="btn btn-sm btn-info"
          onclick='eNMS.automation.copyClipboard("btn-result-${this.id}", ${
        this.instance
      })'
          data-tooltip="Copy to clipboard">
          <span class="glyphicon glyphicon-copy"></span></button>
      </li>
    </ul>`,
    ];
  }
};

models.task = class Task extends Base {
  static get columns() {
    return [
      { data: "name", title: "Name", search: "text" },
      { data: "description", title: "Description", search: "text" },
      { data: "service_name", title: "Service", search: "text" },
      { data: "status", title: "Status", search: "text" },
      { data: "scheduling_mode", title: "Scheduling", search: "text" },
      { data: "start_date", title: "Start Date", search: "text" },
      { data: "end_date", title: "End Date", search: "text" },
      { data: "frequency", title: "Frequency", search: "text" },
      { data: "frequency_unit", title: "Unit", search: "text" },
      {
        data: "crontab_expression",
        title: "Crontab Expression",
        search: "text",
      },
      { data: "next_run_time", title: "Next run time", search: "text" },
      { data: "time_before_next_run", title: "Time left", search: "text" },
      { data: "buttons" },
    ];
  }

  static get controls() {
    return [
      `<button
        class="btn btn-sm btn-info btn-file"
        onclick="eNMS.automation.displayCalendar('task')"
        data-tooltip="Calendar"
        type="button"
      >
        <span class="glyphicon glyphicon-calendar"></span>
      </button>`,
    ];
  }

  get buttons() {
    const state = this.is_active
      ? ["disabled", "active"]
      : ["active", "disabled"];
    return [
      `<ul class="pagination pagination-lg" style="margin: 0px; width: 200px">
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('task', '${
            this.id
          }')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('task', '${this.id}', 'duplicate')"
          data-tooltip="Duplicate">
          <span class="glyphicon glyphicon-duplicate"></span></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-success ${state[0]}" ${
        state[0]
      }
          onclick="resumeTask('${this.id}')" data-tooltip="Play"
            ><span class="glyphicon glyphicon-play"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-danger ${state[1]}" ${
        state[1]
      }
          onclick="pauseTask('${this.id}')" data-tooltip="Pause"
            ><span class="glyphicon glyphicon-pause"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-danger"
          onclick='eNMS.base.showDeletionPanel(${
            this.instance
          })' data-tooltip="Delete"
            ><span class="glyphicon glyphicon-trash"></span
          ></button>
        </li>
      </ul>`,
    ];
  }
};

models.user = class User extends Base {
  static get columns() {
    return [
      { data: "name", title: "Username", search: "text" },
      { data: "email", title: "Email Address", search: "text" },
      { data: "buttons", width: "130px" },
    ];
  }

  static get controls() {
    return [
      super.createNewButton("changelog"),
      super.searchTableButton("changelog"),
      super.refreshTableButton("changelog"),
    ];
  }

  get buttons() {
    return [
      `
      <ul class="pagination pagination-lg" style="margin: 0px;">
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('user', '${
            this.id
          }')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('user', '${this.id}', 'duplicate')"
          data-tooltip="Duplicate"
            ><span class="glyphicon glyphicon-duplicate"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-danger"
          onclick="eNMS.base.showDeletionPanel(${
            this.instance
          })" data-tooltip="Delete"
            ><span class="glyphicon glyphicon-trash"></span
          ></button>
        </li>
      </ul>`,
    ];
  }
};

models.server = class Server extends Base {
  static get columns() {
    return [
      { data: "name", title: "Username", search: "text" },
      { data: "description", title: "Description", search: "text" },
      { data: "ip_address", title: "IP address", search: "text" },
      { data: "weight", title: "Weight", search: "text" },
      { data: "status", title: "Status", search: "text" },
      { data: "buttons", width: "120px" },
    ];
  }

  static get controls() {
    return [
      super.createNewButton("changelog"),
      super.searchTableButton("changelog"),
      super.refreshTableButton("changelog"),
    ];
  }

  get buttons() {
    return [
      `
      <ul class="pagination pagination-lg" style="margin: 0px;">
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('server', '${
            this.id
          }')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('server', '${this.id}', 'duplicate')"
          data-tooltip="Duplicate"
            ><span class="glyphicon glyphicon-duplicate"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-danger"
          onclick="eNMS.base.showDeletionPanel(${
            this.instance
          })" data-tooltip="Delete"
            ><span class="glyphicon glyphicon-trash"></span
          ></button>
        </li>
      </ul>`,
    ];
  }
};

models.changelog = class Changelog extends Base {
  static get columns() {
    return [
      { data: "time", title: "Time", search: "text" },
      { data: "user", title: "User", search: "text" },
      { data: "severity", title: "Severity", search: "text" },
      { data: "content", title: "Content", search: "text" },
      { data: "buttons", width: "120px" },
    ];
  }

  static get controls() {
    return [
      super.createNewButton("changelog"),
      super.searchTableButton("changelog"),
      super.refreshTableButton("changelog"),
    ];
  }

  get buttons() {
    return [
      `<ul class="pagination pagination-lg" style="margin: 0px;">
      ${this.deleteInstanceButton}
      </ul>`,
    ];
  }
};

models.event = class Event extends Base {
  static get columns() {
    return [
      { data: "name", title: "Name", search: "text" },
      { data: "service_name", title: "Service", search: "text" },
      { data: "log_source", title: "Log", search: "text" },
      { data: "log_content", title: "Content", search: "text" },
      { data: "buttons", width: "120px" },
    ];
  }

  static get controls() {
    return [
      super.createNewButton("event"),
      super.searchTableButton("event"),
      super.refreshTableButton("event"),
    ];
  }

  get buttons() {
    return [
      `
      <ul class="pagination pagination-lg" style="margin: 0px; width: 150px">
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('event', '{self.id}')" data-tooltip="Edit"
            ><span class="glyphicon glyphicon-edit"></span
          ></button>
        </li>
        <li>
          <button type="button" class="btn btn-sm btn-primary"
          onclick="eNMS.base.showTypePanel('event', '{self.id}', 'duplicate')"
          data-tooltip="Duplicate">
          <span class="glyphicon glyphicon-duplicate"></span></button>
        </li>
        ${this.deleteInstanceButton}
      </ul>
    `,
    ];
  }
};