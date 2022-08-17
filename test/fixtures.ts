export const rubyFileWithWarnings = `
  def someMethod(    arg )
    if arg
      return arg
    end

    return :default
    end                    
`;

export const jsFile = `
  function printHello() {
    console.log("Hi i'm JavaScript!")
  }

  let something = 3;
`;
