require_relative 'bingip'

curr_dir = "#{File.expand_path(File.dirname(__FILE__))}"
out_file = "kod.png"
in_file  = 'com'


zf       = DiffZipFileGen.new

zf.comp "#{curr_dir}/#{in_file}", out_file

require_relative 'com'

# dest_loc = "#{curr_dir}/decom"
#
# zf.decomp out_file, dest_loc
