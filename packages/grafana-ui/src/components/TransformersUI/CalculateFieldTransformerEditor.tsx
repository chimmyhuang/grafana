import React, { ChangeEvent } from 'react';
import {
  CalculateFieldTransformerOptions,
  DataTransformerID,
  FieldType,
  KeyValue,
  ReducerID,
  standardTransformers,
  TransformerRegistyItem,
  TransformerUIProps,
  NullValueMode,
  BinaryOperationID,
  SelectableValue,
  binaryOperators,
  getFieldTitle,
} from '@grafana/data';
import { StatsPicker } from '../StatsPicker/StatsPicker';
import { Switch } from '../Forms/Legacy/Switch/Switch';
import { Input } from '../Input/Input';
import { FilterPill } from '../FilterPill/FilterPill';
import { HorizontalGroup } from '../Layout/Layout';
import {
  CalculateFieldMode,
  getResultFieldNameForCalculateFieldTransformerOptions,
} from '@grafana/data/src/transformations/transformers/calculateField';
import { Select } from '../Select/Select';
import defaults from 'lodash/defaults';

// Copied from @grafana/data ;(  not sure how to best support his
interface ReduceOptions {
  include?: string; // Assume all fields
  reducer: ReducerID;
  nullValueMode?: NullValueMode;
}

interface BinaryOptions {
  left: string;
  operator: BinaryOperationID;
  right: string;
}

interface CalculateFieldTransformerEditorProps extends TransformerUIProps<CalculateFieldTransformerOptions> {}

interface CalculateFieldTransformerEditorState {
  include: string;
  names: string[];
  selected: string[];
}

const calculationModes = [
  { value: CalculateFieldMode.BinaryOperation, label: 'Binary operation' },
  { value: CalculateFieldMode.ReduceRow, label: 'Reduce row' },
];

export class CalculateFieldTransformerEditor extends React.PureComponent<
  CalculateFieldTransformerEditorProps,
  CalculateFieldTransformerEditorState
> {
  constructor(props: CalculateFieldTransformerEditorProps) {
    super(props);

    this.state = {
      include: props.options?.reduce?.include || '',
      names: [],
      selected: [],
    };
  }

  componentDidMount() {
    this.initOptions();
  }

  componentDidUpdate(oldProps: CalculateFieldTransformerEditorProps) {
    if (this.props.input !== oldProps.input) {
      this.initOptions();
    }
  }

  private initOptions() {
    const { input, options } = this.props;
    const include = options?.reduce?.include || '';
    const configuredOptions = include.split('|');

    const allNames: string[] = [];
    const byName: KeyValue<boolean> = {};

    for (const frame of input) {
      for (const field of frame.fields) {
        if (field.type !== FieldType.number) {
          continue;
        }

        const title = getFieldTitle(field, frame, input);

        if (!byName[title]) {
          byName[title] = true;
          allNames.push(title);
        }
      }
    }

    if (configuredOptions.length) {
      const options: string[] = [];
      const selected: string[] = [];

      for (const v of allNames) {
        if (configuredOptions.includes(v)) {
          selected.push(v);
        }
        options.push(v);
      }

      this.setState({
        names: options,
        selected: selected,
      });
    } else {
      this.setState({ names: allNames, selected: [] });
    }
  }

  onToggleReplaceFields = () => {
    const { options } = this.props;
    this.props.onChange({
      ...options,
      replaceFields: !options.replaceFields,
    });
  };

  onModeChanged = (value: SelectableValue<CalculateFieldMode>) => {
    const { options, onChange } = this.props;
    const mode = value.value ?? CalculateFieldMode.BinaryOperation;
    onChange({
      ...options,
      mode,
    });
  };

  onAliasChanged = (evt: ChangeEvent<HTMLInputElement>) => {
    const { options } = this.props;
    this.props.onChange({
      ...options,
      alias: evt.target.value,
    });
  };

  //---------------------------------------------------------
  // Reduce by Row
  //---------------------------------------------------------

  updateReduceOptions = (v: ReduceOptions) => {
    const { options, onChange } = this.props;
    onChange({
      ...options,
      mode: CalculateFieldMode.ReduceRow,
      reduce: v,
    });
  };

  onFieldToggle = (fieldName: string) => {
    const { selected } = this.state;
    if (selected.indexOf(fieldName) > -1) {
      this.onChange(selected.filter(s => s !== fieldName));
    } else {
      this.onChange([...selected, fieldName]);
    }
  };

  onChange = (selected: string[]) => {
    this.setState({ selected });
    const { reduce } = this.props.options;
    this.updateReduceOptions({
      ...reduce!,
      include: selected.join('|'),
    });
  };

  onStatsChange = (stats: string[]) => {
    const reducer = stats.length ? (stats[0] as ReducerID) : ReducerID.sum;

    const { reduce } = this.props.options;
    this.updateReduceOptions({ ...reduce, reducer });
  };

  renderReduceRow(options?: ReduceOptions) {
    const { names, selected } = this.state;
    options = defaults(options, { reducer: ReducerID.sum });

    return (
      <>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <div className="gf-form-label width-8">Field name</div>
            <HorizontalGroup spacing="xs" align="flex-start" wrap>
              {names.map((o, i) => {
                return (
                  <FilterPill
                    key={`${o}/${i}`}
                    onClick={() => {
                      this.onFieldToggle(o);
                    }}
                    label={o}
                    selected={selected.indexOf(o) > -1}
                  />
                );
              })}
            </HorizontalGroup>
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <div className="gf-form-label width-8">Calculation</div>
            <StatsPicker
              allowMultiple={false}
              className="width-18"
              stats={[options.reducer]}
              onChange={this.onStatsChange}
              defaultStat={ReducerID.sum}
            />
          </div>
        </div>
      </>
    );
  }

  //---------------------------------------------------------
  // Binary Operator
  //---------------------------------------------------------

  updateBinaryOptions = (v: BinaryOptions) => {
    const { options, onChange } = this.props;
    onChange({
      ...options,
      mode: CalculateFieldMode.BinaryOperation,
      binary: v,
    });
  };

  onBinaryLeftChanged = (v: SelectableValue<string>) => {
    const { binary } = this.props.options;
    this.updateBinaryOptions({
      ...binary!,
      left: v.value!,
    });
  };

  onBinaryRightChanged = (v: SelectableValue<string>) => {
    const { binary } = this.props.options;
    this.updateBinaryOptions({
      ...binary!,
      right: v.value!,
    });
  };

  onBinaryOperationChanged = (v: SelectableValue<string>) => {
    const { binary } = this.props.options;
    this.updateBinaryOptions({
      ...binary!,
      operator: v.value! as BinaryOperationID,
    });
  };

  renderBinaryOperation(options?: BinaryOptions) {
    options = defaults(options, { reducer: ReducerID.sum });

    let foundLeft = !options?.left;
    let foundRight = !options?.right;
    const names = this.state.names.map(v => {
      if (v === options?.left) {
        foundLeft = true;
      }
      if (v === options?.right) {
        foundRight = true;
      }
      return { label: v, value: v };
    });
    const leftNames = foundLeft ? names : [...names, { label: options?.left, value: options?.left }];
    const rightNames = foundRight ? names : [...names, { label: options?.right, value: options?.right }];

    const ops = binaryOperators.list().map(v => {
      return { label: v.id, value: v.id };
    });

    return (
      <div className="gf-form-inline">
        <div className="gf-form">
          <div className="gf-form-label width-8">Operation</div>
        </div>
        <div className="gf-form">
          <Select
            allowCustomValue
            placeholder="Field or number"
            options={leftNames}
            className="min-width-18 gf-form-spacing"
            value={options?.left}
            onChange={this.onBinaryLeftChanged}
          />
          <Select
            className="width-8 gf-form-spacing"
            options={ops}
            value={options.operator ?? ops[0].value}
            onChange={this.onBinaryOperationChanged}
          />
          <Select
            allowCustomValue
            placeholder="Field or number"
            className="min-width-10"
            options={rightNames}
            value={options?.right}
            onChange={this.onBinaryRightChanged}
          />
        </div>
      </div>
    );
  }

  //---------------------------------------------------------
  // Render
  //---------------------------------------------------------

  render() {
    const { options } = this.props;

    const mode = options.mode ?? CalculateFieldMode.BinaryOperation;

    return (
      <div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <div className="gf-form-label width-8">Mode</div>
            <Select
              className="width-18"
              options={calculationModes}
              value={calculationModes.find(v => v.value === mode)}
              onChange={this.onModeChanged}
            />
          </div>
        </div>
        {mode === CalculateFieldMode.BinaryOperation && this.renderBinaryOperation(options.binary)}
        {mode === CalculateFieldMode.ReduceRow && this.renderReduceRow(options.reduce)}
        <div className="gf-form-inline">
          <div className="gf-form">
            <div className="gf-form-label width-8">Alias</div>
            <Input
              className="width-18"
              value={options.alias ?? ''}
              placeholder={getResultFieldNameForCalculateFieldTransformerOptions(options)}
              onChange={this.onAliasChanged}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <Switch
              label="Replace all fields"
              labelClass="width-8"
              checked={!!options.replaceFields}
              onChange={this.onToggleReplaceFields}
            />
          </div>
        </div>
      </div>
    );
  }
}

export const calculateFieldTransformRegistryItem: TransformerRegistyItem<CalculateFieldTransformerOptions> = {
  id: DataTransformerID.calculateField,
  editor: CalculateFieldTransformerEditor,
  transformation: standardTransformers.calculateFieldTransformer,
  name: 'Add field from calculation',
  description: 'Use the row values to calculate a new field',
};
